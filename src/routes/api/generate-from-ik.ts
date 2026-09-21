import { parseIkMarkdown } from "~/lib/ik-parser";
import { generateHiraFromIkSteps, type GeminiHiraItem } from "~/lib/gemini";
import { processRiskCalculation } from "~/lib/risk-engine";
import type { APIEvent } from "@solidjs/start/server";

export async function POST(event: APIEvent) {
  try {
    const body = await event.request.json();
    const { markdownContent } = body;

    if (!markdownContent || typeof markdownContent !== "string" || markdownContent.trim() === "") {
      return Response.json(
        { error: "Field 'markdownContent' wajib diisi" },
        { status: 400 }
      );
    }

    // 1. Parsing dokumen Markdown IK
    const metadata = parseIkMarkdown(markdownContent);

    if (metadata.steps.length === 0) {
       return Response.json(
        { error: "Tidak ada langkah kerja (Poin E) yang terdeteksi dalam dokumen." },
        { status: 400 }
      );
    }

    // Buat encoder untuk streaming
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Fungsi helper untuk mengirim event
        const sendEvent = (event: string, data: any) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        try {
          // 2. Panggil Gemini AI secara batch
          const aiItems = await generateHiraFromIkSteps(
            metadata.steps,
            { apdList: metadata.apdList },
            (batchIndex, totalBatches) => {
               sendEvent("progress", { batchIndex, totalBatches });
            }
          );

          // 3. Proses kalkulasi deterministik untuk setiap item
          const processedItems = aiItems.map((item) => {
            const calc = processRiskCalculation({
              likelihood_p: item.likelihood_p,
              severity_dl: item.severity_dl,
              severity_sl: item.severity_sl,
              severity_cm: item.severity_cm,
              severity_as: item.severity_as,
              regulations: item.regulations,
              ecm_factor: item.ecm_factor,
            });

            return {
              subActivity: (item.sub_activity || "").replace(/^E\.[123]\.\d+\.?\s*/i, "").trim(),
              k3Category: item.k3_category,
              condition: item.condition,
              hazard: item.hazard,
              regulations: item.regulations || "",
              impact: item.impact,
              likelihoodP: item.likelihood_p,
              severityDl: item.severity_dl,
              severitySl: item.severity_sl,
              severityCm: item.severity_cm,
              severityAs: item.severity_as,
              maxSeverity: calc.maxSeverity,
              initialRiskScore: calc.initialRiskScore,
              isSignificant: calc.isSignificant,
              existingControl: item.existing_control,
              ecmFactor: item.ecm_factor,
              residualRiskScore: calc.residualRiskScore,
              riskCategory: calc.riskCategory,
              determiningControl: item.determining_control,
              managementResponseCode: item.management_response_code || "",
              managementResponseAction: item.management_response_action || "",
            };
          });

          // Kirim hasil akhir
          sendEvent("complete", {
             activity: {
                title: metadata.title,
                unit: metadata.unit,
                location: "Power House",
                supervisor: metadata.supervisor,
                docNumber: metadata.docNumber,
             },
             items: processedItems,
             ikMetadata: {
                docNumber: metadata.docNumber,
                stepCount: metadata.steps.length
             }
          });

        } catch (error: any) {
          console.error("Batch processing error:", error);
          sendEvent("error", { message: error.message || "Gagal memproses batch IK" });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });

  } catch (error) {
    console.error("Generate HIRA from IK Error:", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return Response.json(
      { error: `Gagal setup IK stream: ${message}` },
      { status: 500 }
    );
  }
}
