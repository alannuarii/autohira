import { generateHiraAnalysis } from "~/lib/gemini";
import { processRiskCalculation } from "~/lib/risk-engine";
import type { APIEvent } from "@solidjs/start/server";

export async function POST(event: APIEvent) {
  try {
    const body = await event.request.json();
    const { activity, unit, location, supervisor } = body;

    if (!activity || typeof activity !== "string" || activity.trim() === "") {
      return Response.json(
        { error: "Field 'activity' wajib diisi" },
        { status: 400 }
      );
    }

    // 1. Panggil Gemini AI untuk analisis kualitatif
    const aiItems = await generateHiraAnalysis(activity.trim());

    // 2. Proses kalkulasi deterministik untuk setiap item
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
        subActivity: item.sub_activity,
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

    return Response.json({
      success: true,
      activity: {
        title: activity.trim(),
        unit: unit || "UP Minahasa / ULPLTD Lopana",
        location: location || "Power House",
        supervisor: supervisor || "Team Leader Pemeliharaan",
      },
      items: processedItems,
    });
  } catch (error) {
    console.error("Generate HIRA Error:", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan internal";
    return Response.json(
      { error: `Gagal generate HIRA: ${message}` },
      { status: 500 }
    );
  }
}
