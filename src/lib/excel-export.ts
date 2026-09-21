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
const DEFAULT_TEMPLATE_URL = "https://aurastorage.serveer.biz.id/api/files/a2736e78-c1fb-4858-9643-a7ada31e3176.xlsx";

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

const setBoxBorder = (ws: ExcelJS.Worksheet, r1: number, c1: number, r2: number, c2: number) => {
  const thin = { style: "thin" as const };
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const cell = ws.getCell(r, c);
      cell.border = {
        top: r === r1 ? thin : undefined,
        bottom: r === r2 ? thin : undefined,
        left: c === c1 ? thin : undefined,
        right: c === c2 ? thin : undefined,
      };
    }
  }
};

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

  // Unmerge semua merge lama di area footer (baris >= 21) agar tidak rusak saat spliceRows
  for (const key of Object.keys(ws._merges)) {
    const match = key.match(/\d+/g);
    if (match && match.some((n) => parseInt(n, 10) >= 21)) {
      try {
        ws.unMergeCells(key);
      } catch {
        // ignore
      }
    }
  }

  // Sesuaikan jumlah baris data (template asli memiliki 8 baris kosong: baris 13-20)
  if (N > 8) {
    // Sisipkan baris kosong sebelum baris 21 (catatan)
    ws.spliceRows(21, 0, ...Array(N - 8).fill([]));
  } else if (N < 8 && N > 0) {
    // Hapus sisa baris kosong jika jumlah item kurang dari 8
    ws.spliceRows(13 + N, 8 - N);
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
    setBoxBorder(ws, 13, 3, 13 + N - 1, 3);
  }

  // 4. SUSUN FOOTER (CATATAN & 3 BLOK PENGESAHAN) SECARA PRESISI
  const baseOffset = 13 + N;

  // Bersihkan seluruh sel footer dari sisa teks template lama dan border rusak
  for (let r = baseOffset; r <= baseOffset + 8; r++) {
    const row = ws.getRow(r);
    row.height = undefined;
    for (let c = 1; c <= 25; c++) {
      const cell = row.getCell(c);
      cell.value = null;
      cell.border = {};
    }
  }

  const fontBase = { name: "Arial Narrow", size: 10 };

  // --- A. BLOK CATATAN (Kolom B s/d I, Kolom 2 s/d 9) ---
  const catatanLines = [
    { text: "Catatan:", bold: true, size: 10 },
    { text: "Kondisi: R (Rutin); NR (Non rutin); N (Normal); AN (Abnormal); E (Emergency)", bold: false, size: 9 },
    { text: "Keparahan: DL (Dampak Lingkungan); CM (Cedera Manusia); SL (Sanksi Lingkungan); AS (Aset); MAX (Maximal)", bold: false, size: 9 },
    { text: "Kategori Risiko: I = Rendah; II = Menengah; III = Tinggi; IV = Sangat Tinggi; V = Ekstrim", bold: false, size: 9 },
    { text: "", bold: false, size: 9 },
    { text: "", bold: false, size: 9 },
    { text: "", bold: false, size: 9 },
  ];

  for (let i = 0; i < 7; i++) {
    const r = baseOffset + i;
    ws.mergeCells(r, 2, r, 9);
    const cell = ws.getCell(r, 2);
    cell.value = catatanLines[i].text;
    cell.font = { name: fontBase.name, bold: catatanLines[i].bold, size: catatanLines[i].size };
    cell.alignment = { vertical: "middle", horizontal: "left" };
  }
  setBoxBorder(ws, baseOffset, 2, baseOffset + 6, 9);

  // --- B. BLOK PENGESAHAN (Kolom J s/d X, 3 Kolom) ---
  const defaultDateStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const signBlocks = [
    {
      header: "Disahkan Oleh,",
      name: signOff.disahkanNama || "Aries Indrianto Elisa",
      jabatan: signOff.disahkanJabatan || "Manager UP Minahasa",
      tanggal: `Tanggal: ${signOff.disahkanTanggal || defaultDateStr}`,
      startCol: 10,
      endCol: 16, // Kolom J - P
    },
    {
      header: "Diperiksa Oleh,",
      name: signOff.diperiksaNama || "Jamal Idris",
      jabatan: signOff.diperiksaJabatan || "Manager ULPLTD Tahuna",
      tanggal: `Tanggal: ${signOff.diperiksaTanggal || defaultDateStr}`,
      startCol: 17,
      endCol: 20, // Kolom Q - T
    },
    {
      header: "Dibuat Oleh,",
      name: signOff.dibuatNama || header.penanggungJawab || "Alan Nuari",
      jabatan: signOff.dibuatJabatan || "Team Leader Pemeliharaan",
      tanggal: `Tanggal: ${signOff.dibuatTanggal || defaultDateStr}`,
      startCol: 21,
      endCol: 24, // Kolom U - X
    },
  ];

  for (const block of signBlocks) {
    const { header: bHeader, name, jabatan, tanggal, startCol, endCol } = block;

    // 1. Header (Disahkan Oleh, / Diperiksa Oleh, / Dibuat Oleh,)
    ws.mergeCells(baseOffset, startCol, baseOffset, endCol);
    const cHead = ws.getCell(baseOffset, startCol);
    cHead.value = bHeader;
    cHead.font = { name: fontBase.name, size: 10, bold: false };
    cHead.alignment = { vertical: "middle", horizontal: "center" };
    setBoxBorder(ws, baseOffset, startCol, baseOffset, endCol);

    // 2. Area Tanda Tangan (3 baris kosong)
    ws.mergeCells(baseOffset + 1, startCol, baseOffset + 3, endCol);
    setBoxBorder(ws, baseOffset + 1, startCol, baseOffset + 3, endCol);

    // 3. Nama Pejabat (Bold + Underline)
    ws.mergeCells(baseOffset + 4, startCol, baseOffset + 4, endCol);
    const cName = ws.getCell(baseOffset + 4, startCol);
    cName.value = name;
    cName.font = { name: fontBase.name, size: 10, bold: true, underline: true };
    cName.alignment = { vertical: "middle", horizontal: "center" };
    setBoxBorder(ws, baseOffset + 4, startCol, baseOffset + 4, endCol);

    // 4. Jabatan Pejabat (Bold)
    ws.mergeCells(baseOffset + 5, startCol, baseOffset + 5, endCol);
    const cJab = ws.getCell(baseOffset + 5, startCol);
    cJab.value = jabatan;
    cJab.font = { name: fontBase.name, size: 10, bold: true };
    cJab.alignment = { vertical: "middle", horizontal: "center" };
    setBoxBorder(ws, baseOffset + 5, startCol, baseOffset + 5, endCol);

    // 5. Tanggal
    ws.mergeCells(baseOffset + 6, startCol, baseOffset + 6, endCol);
    const cDate = ws.getCell(baseOffset + 6, startCol);
    cDate.value = tanggal;
    cDate.font = { name: fontBase.name, size: 9 };
    cDate.alignment = { vertical: "middle", horizontal: "center" };
    setBoxBorder(ws, baseOffset + 6, startCol, baseOffset + 6, endCol);
  }

  // Tulis workbook ke buffer
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
