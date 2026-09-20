// ============================================================
// AutoHIRA - Gemini 2.0 Flash AI Integration
// Structured Output untuk analisis HIRADC
// ============================================================

import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/** JSON Schema response untuk structured output Gemini */
const hiraResponseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      sub_activity: {
        type: Type.STRING,
        description: "Rincian sub-aktivitas pekerjaan",
      },
      k3_category: {
        type: Type.STRING,
        description: "Klasifikasi K3 atau Lingkungan",
        enum: ["K3", "L", "K3/L"],
      },
      condition: {
        type: Type.STRING,
        description: "Kondisi pekerjaan",
        enum: ["Rutin", "Non Rutin", "Normal", "Abnormal", "Emergency"],
      },
      hazard: {
        type: Type.STRING,
        description: "Potensi bahaya K3 / Aspek Lingkungan",
      },
      regulations: {
        type: Type.STRING,
        description: "Peraturan Perundangan K3 terkait (Indonesia)",
      },
      impact: {
        type: Type.STRING,
        description: "Potensi dampak / risiko K3",
      },
      likelihood_p: {
        type: Type.INTEGER,
        description: "Nilai Kemungkinan (1-5): 1=Sangat Jarang, 2=Jarang, 3=Sedang, 4=Sering, 5=Sangat Sering",
      },
      severity_dl: {
        type: Type.INTEGER,
        description: "Keparahan - Dampak Lingkungan (1-5)",
      },
      severity_sl: {
        type: Type.INTEGER,
        description: "Keparahan - Safety/Keselamatan (1-5)",
      },
      severity_cm: {
        type: Type.INTEGER,
        description: "Keparahan - Compliance/Citra (1-5)",
      },
      severity_as: {
        type: Type.INTEGER,
        description: "Keparahan - Asset/Finansial (1-5)",
      },
      existing_control: {
        type: Type.STRING,
        description: "Pengendalian yang ada saat ini (ECM) dengan hierarki: 1.Eliminasi, 2.Substitusi, 3.Rekayasa Teknik, 4.Administrasi, 5.APD",
      },
      ecm_factor: {
        type: Type.NUMBER,
        description: "Faktor ECM (0.1-1.0): efektivitas kontrol yang ada",
      },
      determining_control: {
        type: Type.STRING,
        description: "Pengendalian risiko lanjutan dengan hierarki 1-5",
      },
      management_response_code: {
        type: Type.STRING,
        description: "Kode respon manajemen",
        enum: ["PK", "P", "IK", ""],
      },
      management_response_action: {
        type: Type.STRING,
        description: "Rencana tindak lanjut manajemen",
      },
    },
    propertyOrdering: [
      "sub_activity", "k3_category", "condition", "hazard", "regulations",
      "impact", "likelihood_p", "severity_dl", "severity_sl", "severity_cm",
      "severity_as", "existing_control", "ecm_factor", "determining_control",
      "management_response_code", "management_response_action",
    ],
    required: [
      "sub_activity", "k3_category", "condition", "hazard", "regulations",
      "impact", "likelihood_p", "severity_dl", "severity_sl", "severity_cm",
      "severity_as", "existing_control", "ecm_factor", "determining_control",
    ],
  },
};

/** Tipe data yang dikembalikan oleh Gemini */
export interface GeminiHiraItem {
  sub_activity: string;
  k3_category: "K3" | "L" | "K3/L";
  condition: "Rutin" | "Non Rutin" | "Normal" | "Abnormal" | "Emergency";
  hazard: string;
  regulations: string;
  impact: string;
  likelihood_p: number;
  severity_dl: number;
  severity_sl: number;
  severity_cm: number;
  severity_as: number;
  existing_control: string;
  ecm_factor: number;
  determining_control: string;
  management_response_code?: string;
  management_response_action?: string;
}

/**
 * Memanggil Gemini 2.0 Flash untuk menganalisis aktivitas pembangkit listrik
 * dan menghasilkan data HIRADC terstruktur.
 */
export async function generateHiraAnalysis(activityDescription: string): Promise<GeminiHiraItem[]> {
  const systemPrompt = `Kamu adalah seorang ahli Keselamatan dan Kesehatan Kerja (K3) serta Lingkungan yang sangat berpengalaman di lingkungan pembangkit listrik Indonesia (PLTD, PLTU, PLTG, PLTA). 

Tugasmu adalah melakukan analisis HIRADC (Hazard Identification, Risk Assessment, and Determining Control) berdasarkan standar formulir "FMKP Form HIRADC Final 2023" yang digunakan oleh PT PLN Nusantara Power / PT PJB.

Pedoman analisis:
1. **Sub-Aktivitas**: Pecah aktivitas utama menjadi 3-7 sub-aktivitas yang spesifik dan relevan dengan pekerjaan di pembangkit listrik.
2. **K3/L**: Klasifikasi apakah aspek terkait Keselamatan Kerja (K3), Lingkungan (L), atau keduanya (K3/L).
3. **Kondisi**: Tentukan apakah pekerjaan Rutin, Non Rutin, atau Emergency. Pekerjaan pemeliharaan berkala default = Rutin.
4. **Potensi Bahaya**: Identifikasi sumber bahaya spesifik (contoh: Tegangan listrik 20kV, Kebisingan >85dB, Bahan kimia B3, Ruang terbatas, Bekerja di ketinggian).
5. **Regulasi**: Rujuk regulasi K3 Indonesia yang REAL dan VALID (contoh: Permenaker No. 05/2018, PP 50/2012, Permen ESDM, UU No.1/1970).
6. **Dampak**: Identifikasi dampak potensial yang spesifik (contoh: Tersengat listrik, Luka bakar, Gangguan pendengaran NIHL).
7. **Likelihood P (1-5)**: Estimasi probabilitas berdasarkan frekuensi paparan dan kontrol yang ada.
8. **Severity DL/SL/CM/AS (1-5)**: Estimasi keparahan untuk masing-masing aspek.
9. **ECM**: Jelaskan kontrol yang sudah ada dengan format hierarki (1.Eliminasi, 2.Substitusi, 3.Rekayasa Teknik, 4.Administrasi, 5.APD).
10. **Faktor ECM (0.1-1.0)**: Estimasi efektivitas kontrol yang ada. 0.1 = sangat efektif, 1.0 = tidak ada kontrol.
11. **Pengendalian Lanjutan**: Rekomendasi pengendalian tambahan dengan hierarki 1-5.
12. **Respon Manajemen**: PK=Program Kerja, P=Prosedur, IK=Instruksi Kerja.

PENTING: Berikan analisis yang REALISTIS dan TEKNIS sesuai dengan konteks pembangkit listrik Indonesia. Semua regulasi harus valid dan diakui di Indonesia.`;

  const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
    contents: `Analisis HIRADC untuk aktivitas pembangkit listrik berikut:\n\n"${activityDescription}"\n\nBerikan analisis lengkap dengan minimal 3 sub-aktivitas dan identifikasi bahaya yang relevan.`,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: hiraResponseSchema,
      systemInstruction: systemPrompt,
      temperature: 0.7,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini API mengembalikan response kosong");
  }

  const items: GeminiHiraItem[] = JSON.parse(text);

  // Validasi & clamp nilai
  return items.map((item) => ({
    ...item,
    likelihood_p: Math.max(1, Math.min(5, item.likelihood_p)),
    severity_dl: Math.max(1, Math.min(5, item.severity_dl)),
    severity_sl: Math.max(1, Math.min(5, item.severity_sl)),
    severity_cm: Math.max(1, Math.min(5, item.severity_cm)),
    severity_as: Math.max(1, Math.min(5, item.severity_as)),
    ecm_factor: Math.max(0.1, Math.min(1.0, item.ecm_factor)),
  }));
}

/**
 * Memanggil Gemini 2.0 Flash untuk menganalisis daftar langkah kerja dari dokumen IK
 * secara batching (6-8 langkah per batch).
 */
export async function generateHiraFromIkSteps(
  steps: string[],
  ikMetadata: { apdList: string[] },
  onProgress?: (batchIndex: number, totalBatches: number) => void
): Promise<GeminiHiraItem[]> {
  const batchSize = 6;
  const totalBatches = Math.ceil(steps.length / batchSize);
  let allItems: GeminiHiraItem[] = [];

  for (let i = 0; i < steps.length; i += batchSize) {
    const currentBatch = Math.floor(i / batchSize) + 1;
    if (onProgress) onProgress(currentBatch, totalBatches);

    const stepsBatch = steps.slice(i, i + batchSize);
    
    const systemPrompt = `Kamu adalah seorang ahli Keselamatan dan Kesehatan Kerja (K3) serta Lingkungan yang sangat berpengalaman di lingkungan pembangkit listrik Indonesia.

Tugasmu adalah melakukan analisis HIRADC berdasarkan standar "FMKP Form HIRADC Final 2023" untuk PT PLN Nusantara Power / PT PJB.
Analisis HIRADC standar PLN NP untuk langkah-langkah kerja berikut dari IK:

${stepsBatch.join("\n")}

APD Resmi Tersedia (Dasar Kolom 13 ECM):
${ikMetadata.apdList.join(", ")}

ATURAN:
1. Jangan buat sub-aktivitas baru! Gunakan tepat teks langkah di atas sebagai "sub_activity". Jika ada ${stepsBatch.length} langkah, maka harus ada tepat ${stepsBatch.length} item di array hasil.
2. Isi kolom 4-18 (k3_category, condition, hazard, regulations, impact, likelihood_p, severity_dl, severity_sl, severity_cm, severity_as, existing_control, ecm_factor, determining_control, management_response_code).

Pedoman pengisian kolom:
- k3_category: "K3", "L", atau "K3/L".
- condition: "Rutin", "Non Rutin", atau "Emergency".
- likelihood_p (1-5): Peluang terjadinya.
- severity_dl, sl, cm, as (1-5): Keparahan.
- ecm_factor (0.1-1.0): Efektivitas kontrol saat ini.
- determining_control: Rekomendasi tambahan.
- management_response_code: "PK", "P", atau "IK".`;

    const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
      contents: `Buatkan analisis HIRADC untuk ${stepsBatch.length} langkah instruksi kerja ini sesuai urutan aslinya. JANGAN lewatkan satupun.`,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: hiraResponseSchema,
        systemInstruction: systemPrompt,
        temperature: 0.2, // rendah untuk menjaga deterministik sub-aktivitas
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini API mengembalikan response kosong pada batch " + i);
    }

    const items: GeminiHiraItem[] = JSON.parse(text);
    
    // Validasi & clamp nilai
    const validatedItems = items.map((item) => ({
      ...item,
      likelihood_p: Math.max(1, Math.min(5, item.likelihood_p)),
      severity_dl: Math.max(1, Math.min(5, item.severity_dl)),
      severity_sl: Math.max(1, Math.min(5, item.severity_sl)),
      severity_cm: Math.max(1, Math.min(5, item.severity_cm)),
      severity_as: Math.max(1, Math.min(5, item.severity_as)),
      ecm_factor: Math.max(0.1, Math.min(1.0, item.ecm_factor)),
    }));

    allItems = allItems.concat(validatedItems);
  }

  return allItems;
}
