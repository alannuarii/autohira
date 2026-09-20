// ============================================================
// AutoHIRA - Deterministic Risk Engine
// Kalkulasi 100% konsisten sesuai formulir FMKP Form HIRADC
// ============================================================

/**
 * Menghitung S_max = Max(DL, SL, CM, AS)
 */
export function calculateMaxSeverity(dl: number, sl: number, cm: number, as: number): number {
  return Math.max(dl, sl, cm, as);
}

/**
 * Kolom 11: Risiko Awal = P × S_max
 */
export function calculateInitialRisk(p: number, maxSeverity: number): number {
  return p * maxSeverity;
}

/**
 * Kolom 12: Aspek Penting / Tidak Penting
 * IF(AND(Regulasi == "", RisikoAwal < 15), "Tidak Penting", "Penting")
 */
export function evaluateSignificance(regulations: string | null | undefined, initialRisk: number): string {
  const hasRegulations = regulations !== null && regulations !== undefined && regulations.trim() !== "";
  if (!hasRegulations && initialRisk < 15) {
    return "Tidak Penting";
  }
  return "Penting";
}

/**
 * Kolom 15: Tingkat Risiko Akhir = ceil(Risiko Awal × Faktor ECM)
 */
export function calculateResidualRisk(initialRisk: number, ecmFactor: number): number {
  return Math.ceil(initialRisk * ecmFactor);
}

/**
 * Kolom 16: Kategori Risiko berdasarkan matriks evaluasi PJB
 * Kombinasi Tingkat Risiko Akhir dan S_max
 *
 * Matriks Risiko PJB:
 * ┌────────────────┬───────┬───────┬───────┬───────┬───────┐
 * │ Residual\S_max │   1   │   2   │   3   │   4   │   5   │
 * ├────────────────┼───────┼───────┼───────┼───────┼───────┤
 * │     1          │ Rndh  │ Rndh  │ Rndh  │ Rndh  │ Mod   │
 * │     2          │ Rndh  │ Rndh  │ Mod   │ Mod   │ Tgg   │
 * │     3          │ Rndh  │ Mod   │ Mod   │ Tgg   │ Tgg   │
 * │     4          │ Mod   │ Mod   │ Tgg   │ Tgg   │ STgg  │
 * │     5          │ Mod   │ Tgg   │ Tgg   │ STgg  │ Eks   │
 * │     6-8        │ Mod   │ Tgg   │ STgg  │ STgg  │ Eks   │
 * │     9-10       │ Tgg   │ STgg  │ STgg  │ Eks   │ Eks   │
 * │     11-15      │ Tgg   │ STgg  │ Eks   │ Eks   │ Eks   │
 * │     16-20      │ STgg  │ Eks   │ Eks   │ Eks   │ Eks   │
 * │     21-25      │ Eks   │ Eks   │ Eks   │ Eks   │ Eks   │
 * └────────────────┴───────┴───────┴───────┴───────┴───────┘
 */
export function determineRiskCategory(residualRisk: number, maxSeverity: number): string {
  const T = residualRisk;
  const O = maxSeverity;

  // Formula eksak sel U14 pada FMKP Form HIRADC Final 2023:
  // IF(AND(T<5,O<=2),"Rendah",
  // IF(AND(10>T>=5,O<3),"Moderate",
  // IF(AND(T<9,O=3),"Moderate",
  // IF(AND(T>=9,O=3),"Tinggi",
  // IF(AND(T<16,O=4),"Tinggi",
  // IF(AND(T<10,O=5),"Tinggi",
  // IF(AND(T>=16,O=4),"Sangat Tinggi",
  // IF(AND(T>=20,O=5),"Ekstrim","Sangat Tinggi"))))))))
  if (T < 5 && O <= 2) return "Rendah";
  if (T >= 5 && T < 10 && O < 3) return "Moderate";
  if (T < 9 && O === 3) return "Moderate";
  if (T >= 9 && O === 3) return "Tinggi";
  if (T < 16 && O === 4) return "Tinggi";
  if (T < 10 && O === 5) return "Tinggi";
  if (T >= 16 && O === 4) return "Sangat Tinggi";
  if (T >= 20 && O === 5) return "Ekstrim";
  return "Sangat Tinggi";
}

/**
 * Proses lengkap kalkulasi deterministik untuk satu HIRA item
 */
export function processRiskCalculation(item: {
  likelihood_p: number;
  severity_dl: number;
  severity_sl: number;
  severity_cm: number;
  severity_as: number;
  regulations: string | null | undefined;
  ecm_factor: number;
}) {
  const maxSeverity = calculateMaxSeverity(
    item.severity_dl,
    item.severity_sl,
    item.severity_cm,
    item.severity_as
  );
  const initialRiskScore = calculateInitialRisk(item.likelihood_p, maxSeverity);
  const isSignificant = evaluateSignificance(item.regulations, initialRiskScore);
  const residualRiskScore = calculateResidualRisk(initialRiskScore, item.ecm_factor);
  const riskCategory = determineRiskCategory(residualRiskScore, maxSeverity);

  return {
    maxSeverity,
    initialRiskScore,
    isSignificant,
    residualRiskScore,
    riskCategory,
  };
}
