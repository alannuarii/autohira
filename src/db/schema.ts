import { pgTable, serial, text, integer, doublePrecision, timestamp, varchar } from "drizzle-orm/pg-core";

// ==============================
// Tabel Master: Activities
// ==============================
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  docNumber: varchar("doc_number", { length: 100 }),
  unit: varchar("unit", { length: 150 }).default("UP Minahasa / ULPLTD Lopana"),
  location: varchar("location", { length: 150 }).default("Power House"),
  supervisor: varchar("supervisor", { length: 150 }).default("Team Leader Pemeliharaan"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==============================
// Tabel Detail: HIRA Items (Kolom 4-18)
// ==============================
export const hiraItems = pgTable("hira_items", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id")
    .references(() => activities.id, { onDelete: "cascade" })
    .notNull(),

  // Sub Aktivitas
  subActivity: text("sub_activity").notNull(),

  // Kolom 4: K3 / L / K3/L
  k3Category: varchar("k3_category", { length: 20 }).notNull(),

  // Kolom 5: Rutin / Non Rutin / Emergency
  condition: varchar("condition", { length: 50 }).notNull(),

  // Kolom 6: Potensi Bahaya
  hazard: text("hazard").notNull(),

  // Kolom 7: Peraturan Perundangan Terkait
  regulations: text("regulations"),

  // Kolom 8: Potensi Dampak
  impact: text("impact").notNull(),

  // Kolom 9: Kemungkinan (P: 1-5)
  likelihoodP: integer("likelihood_p").notNull(),

  // Kolom 10: Keparahan (S) - 4 Sub-kriteria
  severityDl: integer("severity_dl").notNull().default(1), // Dampak Lingkungan
  severitySl: integer("severity_sl").notNull().default(1), // Safety / Keselamatan
  severityCm: integer("severity_cm").notNull().default(1), // Compliance / Citra
  severityAs: integer("severity_as").notNull().default(1), // Asset / Finansial

  // Kolom 10: S_max = Max(DL, SL, CM, AS)
  maxSeverity: integer("max_severity").notNull(),

  // Kolom 11: Risiko Awal = P × S_max
  initialRiskScore: integer("initial_risk_score").notNull(),

  // Kolom 12: Aspek Penting / Tidak Penting
  isSignificant: varchar("is_significant", { length: 50 }).notNull(),

  // Kolom 13: Pengendalian Yang Ada Saat Ini (ECM)
  existingControl: text("existing_control").notNull(),

  // Kolom 14: Faktor ECM (0.1 - 1.0)
  ecmFactor: doublePrecision("ecm_factor").notNull().default(0.1),

  // Kolom 15: Tingkat Risiko Akhir = ceil(Risiko Awal × Faktor ECM)
  residualRiskScore: integer("residual_risk_score").notNull(),

  // Kolom 16: Kategori Risiko
  riskCategory: varchar("risk_category", { length: 50 }).notNull(),

  // Kolom 17: Pengendalian Risiko Lanjutan (Hierarki 1-5)
  determiningControl: text("determining_control").notNull(),

  // Kolom 18: Respon Manajemen
  managementResponseCode: varchar("management_response_code", { length: 20 }),
  managementResponseAction: text("management_response_action"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});
