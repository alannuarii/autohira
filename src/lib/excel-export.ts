import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";

export interface ExcelHeaderData {
  unit: string;
  divisiAktivitas: string;
  lokasi: string;
  penanggungJawab: string;
  noDokumen: string;
  noRevisi: string;
  tglTerbit: string;
}

export interface ExcelSignOffData {
  disahkanNama: string;
  disahkanJabatan: string;
  disahkanTanggal: string;
  diperiksaNama: string;
  diperiksaJabatan: string;
  diperiksaTanggal: string;
  dibuatNama: string;
  dibuatJabatan: string;
  dibuatTanggal: string;
}

export interface ExcelExportPayload {
  header: ExcelHeaderData;
  signOff: ExcelSignOffData;
  items: Array<{
    subActivity: string;
    k3Category: string;
    condition: string;
    hazard: string;
    regulations: string;
    impact: string;
    likelihoodP: number;
    severityDl: number;
    severitySl: number;
    severityCm: number;
    severityAs: number;
    maxSeverity: number;
    initialRiskScore: number;
    isSignificant: string;
    existingControl: string;
    ecmFactor: number;
    residualRiskScore: number;
    riskCategory: string;
    determiningControl: string;
    managementResponseCode: string;
    managementResponseAction: string;
  }>;
  mainActivityTitle?: string;
}

let cachedTemplateBuffer: Buffer | null = null;
const DEFAULT_TEMPLATE_URL = "https://aurastorage.serveer.biz.id/api/files/e67066d1-5087-4736-b3bb-722b36ea3b94.xlsx";

export async function getTemplateBuffer(): Promise<Buffer> {
  if (cachedTemplateBuffer) {
    return cachedTemplateBuffer;
  }

  const templateUrl = process.env.AURA_STORAGE_TEMPLATE_URL || DEFAULT_TEMPLATE_URL;

  try {
    const headers: Record<string, string> = {};
    if (process.env.AURA_STORAGE_API_KEY) {
      headers["Authorization"] = `Bearer ${process.env.AURA_STORAGE_API_KEY}`;
    }

    const response = await fetch(templateUrl, { headers });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    cachedTemplateBuffer = Buffer.from(arrayBuffer);
    return cachedTemplateBuffer;
  } catch (error: any) {
    const localFallbackPath = path.resolve(process.cwd(), "Form HIRADC.xlsx");
    if (fs.existsSync(localFallbackPath)) {
      return await fs.promises.readFile(localFallbackPath);
    }
    throw new Error(`Gagal memuat template Excel HIRADC dari AuraStorage: ${error.message}`);
  }
}

export async function generateHiradcExcel(payload: ExcelExportPayload): Promise<Buffer> {
  const templateBuffer = await getTemplateBuffer();

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(templateBuffer);
  const ws = wb.getWorksheet("form HIRA");
  if (!ws) {
    throw new Error("Worksheet 'form HIRA' tidak ditemukan dalam file template.");
  }

  const { header, signOff, items, mainActivityTitle } = payload;
  const N = items.length;

  // Sesuaikan jumlah baris data (template asli memiliki 8 baris kosong: baris 13-20)
  if (N > 8) {
    // Sisipkan baris kosong sebelum baris 21 (catatan)
    ws.spliceRows(21, 0, ...Array(N - 8).fill([]));
  } else if (N < 8 && N > 0) {
    // Unmerge footer merges sebelum baris dihapus agar ExcelJS tidak membatalkan atau merusak merge
    for (const key of Object.keys(ws._merges)) {
      const rowNum = parseInt(key.replace(/\D/g, ""), 10);
      if (rowNum >= 21) {
        ws.unMergeCells(key);
      }
    }

    // Hapus sisa baris kosong jika jumlah item kurang dari 8
    ws.spliceRows(13 + N, 8 - N);

    // Pasang kembali merge blok pengesahan pada posisi baris yang baru
    const baseOffset = 13 + N;
    ws.mergeCells(baseOffset, 10, baseOffset, 16);     // Header Disahkan
    ws.mergeCells(baseOffset, 17, baseOffset, 20);     // Header Diperiksa
    ws.mergeCells(baseOffset, 21, baseOffset, 24);     // Header Dibuat

    ws.mergeCells(baseOffset + 1, 10, baseOffset + 3, 16); // Area TTD Disahkan
    ws.mergeCells(baseOffset + 1, 17, baseOffset + 3, 20); // Area TTD Diperiksa
    ws.mergeCells(baseOffset + 1, 21, baseOffset + 3, 24); // Area TTD Dibuat

    ws.mergeCells(baseOffset + 4, 10, baseOffset + 4, 16); // Nama Disahkan
    ws.mergeCells(baseOffset + 4, 17, baseOffset + 4, 20); // Nama Diperiksa
    ws.mergeCells(baseOffset + 4, 21, baseOffset + 4, 24); // Nama Dibuat

    ws.mergeCells(baseOffset + 5, 10, baseOffset + 5, 16); // Jabatan Disahkan
    ws.mergeCells(baseOffset + 5, 17, baseOffset + 5, 20); // Jabatan Diperiksa
    ws.mergeCells(baseOffset + 5, 21, baseOffset + 5, 24); // Jabatan Dibuat

    ws.mergeCells(baseOffset + 6, 10, baseOffset + 6, 16); // Tanggal Disahkan
    ws.mergeCells(baseOffset + 6, 17, baseOffset + 6, 20); // Tanggal Diperiksa
    ws.mergeCells(baseOffset + 6, 21, baseOffset + 6, 24); // Tanggal Dibuat
  }

  // 1. ISI HEADER DOKUMEN (Menggantikan nilai XXX)
  ws.getCell("E2").value = `: ${header.unit || "UP Minahasa / ULPLTD Tahuna"}`;
  ws.getCell("X2").value = header.noDokumen || "IKMH-314-10.3.3.a-036F";

  ws.getCell("E3").value = `: ${header.divisiAktivitas || mainActivityTitle || "Pemeliharaan Rutin Mesin"}`;
  ws.getCell("X3").value = header.noRevisi || "01";

  ws.getCell("E4").value = `: ${header.lokasi || "Power House"}`;
  ws.getCell("X4").value = header.tglTerbit || new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  ws.getCell("E5").value = `: ${header.penanggungJawab || "Team Leader Pemeliharaan"}`;
  ws.getCell("X5").value = "1 dari 1";

  // 2. CONTOH STYLE DARI BARIS 13 UNTUK BARIS DATA BARU
  const baseRow = ws.getRow(13);
  const colStyles: Array<{ font?: any; alignment?: any; border?: any; fill?: any }> = [];
  for (let c = 2; c <= 24; c++) {
    const cell = baseRow.getCell(c);
    colStyles[c] = {
      font: cell.font,
      alignment: cell.alignment,
      border: cell.border,
      fill: cell.fill,
    };
  }

  // 3. ISI BARIS DATA HIRADC
  for (let i = 0; i < N; i++) {
    const rIdx = 13 + i;
    const row = ws.getRow(rIdx);
    const item = items[i];

    // Reset tinggi baris agar Excel menghitung auto-fit secara dinamis (tidak terpotong)
    row.height = undefined;

    // Terapkan style template ke setiap sel, dengan font non-bold untuk baris data
    for (let c = 2; c <= 24; c++) {
      const cell = row.getCell(c);
      if (colStyles[c]) {
        cell.font = { ...colStyles[c].font, bold: false };
        cell.alignment = colStyles[c].alignment;
        cell.border = colStyles[c].border;
        cell.fill = colStyles[c].fill;
      }
    }

    // Format rencana aksi kolom X (fallback cerdas jika kosong)
    let actionText = item.managementResponseAction ? item.managementResponseAction.replace(/^:\s*/, "").trim() : "";
    if (!actionText) {
      const code = item.managementResponseCode || "IK";
      if (code === "IK") actionText = "Terapkan dan evaluasi kepatuhan Instruksi Kerja (IK) secara berkala";
      else if (code === "PK") actionText = "Masukkan dalam Program Kerja (PK) K3 dan mitigasi risiko";
      else if (code === "P") actionText = "Penyesuaian Prosedur Operasional Standar (SOP) K3";
      else actionText = "Tindak lanjuti mitigasi risiko sesuai hierarki pengendalian";
    }

    row.getCell(2).value = i + 1; // NO (Kolom B)
    row.getCell(3).value = i === 0 ? (mainActivityTitle || header.divisiAktivitas || "") : ""; // Aktivitas Utama (Kolom C)
    row.getCell(4).value = item.subActivity || ""; // Sub Aktivitas (Kolom D)
    row.getCell(5).value = item.k3Category || "K3"; // K3/L (Kolom E)
    row.getCell(6).value = item.condition || "Rutin"; // Kondisi (Kolom F)
    row.getCell(7).value = item.hazard || ""; // Potensi Bahaya (Kolom G)
    row.getCell(8).value = item.regulations || ""; // Regulasi K3 (Kolom H)
    row.getCell(9).value = item.impact || ""; // Dampak K3 (Kolom I)
    row.getCell(10).value = item.likelihoodP ?? 1; // P (Kolom J)
    row.getCell(11).value = item.severityDl ?? 1; // DL (Kolom K)
    row.getCell(12).value = item.severitySl ?? 1; // SL (Kolom L)
    row.getCell(13).value = item.severityCm ?? 1; // CM (Kolom M)
    row.getCell(14).value = item.severityAs ?? 1; // AS (Kolom N)
    row.getCell(15).value = item.maxSeverity ?? 1; // S_max (Kolom O)
    row.getCell(16).value = item.initialRiskScore ?? 1; // PxS (Kolom P)
    row.getCell(17).value = item.isSignificant || "Penting"; // Aspek Penting (Kolom Q)
    row.getCell(18).value = item.existingControl || ""; // ECM (Kolom R)
    row.getCell(19).value = item.ecmFactor ?? 0.1; // Faktor ECM (Kolom S)
    row.getCell(20).value = item.residualRiskScore ?? 1; // Risiko Akhir (Kolom T)
    row.getCell(21).value = item.riskCategory || "Rendah"; // Kategori Risiko (Kolom U)
    row.getCell(22).value = item.determiningControl || ""; // Pengendalian Lanjutan (Kolom V)
    row.getCell(23).value = item.managementResponseCode || "IK"; // Respon Manajemen PK/P/IK (Kolom W)
    row.getCell(24).value = `: ${actionText}`; // Rencana Tindak Lanjut (Kolom X)
  }

  // Gabungkan (Merge) Kolom C (Aktivitas Utama) di seluruh baris sub-aktivitas agar tampilan rapi & profesional
  if (N > 1) {
    ws.mergeCells(13, 3, 13 + N - 1, 3);
    const cellC = ws.getCell(13, 3);
    cellC.value = mainActivityTitle || header.divisiAktivitas || "";
    cellC.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  }

  // 4. ISI FOOTER PENGESAHAN (Menggantikan nilai XXX pada blok tanda tangan)
  const baseOffset = 13 + N;
  const nameRow = baseOffset + 4;
  const jabRow = baseOffset + 5;
  const dateRow = baseOffset + 6;

  // Nama Pejabat
  ws.getCell(`J${nameRow}`).value = signOff.disahkanNama || "Aries Indrianto Elisa";
  ws.getCell(`Q${nameRow}`).value = signOff.diperiksaNama || "Jamal Idris";
  ws.getCell(`U${nameRow}`).value = signOff.dibuatNama || header.penanggungJawab || "Alan Nuari";

  // Jabatan Pejabat
  ws.getCell(`J${jabRow}`).value = signOff.disahkanJabatan || "Manager UP Minahasa";
  ws.getCell(`Q${jabRow}`).value = signOff.diperiksaJabatan || "Manager ULPLTD Tahuna";
  ws.getCell(`U${jabRow}`).value = signOff.dibuatJabatan || "Team Leader Pemeliharaan";

  // Tanggal
  const defaultDateStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  ws.getCell(`J${dateRow}`).value = `Tanggal: ${signOff.disahkanTanggal || defaultDateStr}`;
  ws.getCell(`Q${dateRow}`).value = `Tanggal: ${signOff.diperiksaTanggal || defaultDateStr}`;
  ws.getCell(`U${dateRow}`).value = `Tanggal: ${signOff.dibuatTanggal || defaultDateStr}`;

  // Tulis workbook ke buffer
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
