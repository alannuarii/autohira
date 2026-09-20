import { generateHiradcExcel, type ExcelExportPayload } from "~/lib/excel-export";
import type { APIEvent } from "@solidjs/start/server";

export async function POST(event: APIEvent) {
  try {
    const payload = (await event.request.json()) as ExcelExportPayload;

    if (!payload || !payload.items || !Array.isArray(payload.items)) {
      return Response.json(
        { error: "Payload items tidak valid atau kosong" },
        { status: 400 }
      );
    }

    const buffer = await generateHiradcExcel(payload);
    const fileName = `FMKP_HIRADC_${(payload.header?.unit || "PLN")
      .replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.xlsx`;

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Export Excel Error:", error);
    const message = error instanceof Error ? error.message : "Gagal mengekspor file Excel";
    return Response.json({ error: message }, { status: 500 });
  }
}
