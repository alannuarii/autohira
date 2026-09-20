import { For, Show, createSignal, createMemo } from "solid-js";
import RiskBadge from "./RiskBadge";
import ExcelExportModal from "./ExcelExportModal";
import {
  calculateMaxSeverity,
  calculateInitialRisk,
  evaluateSignificance,
  calculateResidualRisk,
  determineRiskCategory,
} from "~/lib/risk-engine";

export interface HiraItem {
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
}

interface HiraTableProps {
  items: HiraItem[];
  onItemsChange: (items: HiraItem[]) => void;
  activityInfo?: {
    title: string;
    unit: string;
    location: string;
    supervisor: string;
  } | null;
}

export default function HiraTable(props: HiraTableProps) {
  const [expandedRow, setExpandedRow] = createSignal<number | null>(null);
  const [filterText, setFilterText] = createSignal("");
  const [isExportModalOpen, setIsExportModalOpen] = createSignal(false);

  // Statistics
  const stats = createMemo(() => {
    let highRiskCount = 0;
    let significantCount = 0;

    props.items.forEach((item) => {
      if (
        item.riskCategory === "Tinggi" ||
        item.riskCategory === "Sangat Tinggi" ||
        item.riskCategory === "Ekstrim"
      ) {
        highRiskCount++;
      }
      if (item.isSignificant === "Penting") {
        significantCount++;
      }
    });

    return {
      total: props.items.length,
      highRisk: highRiskCount,
      significant: significantCount,
    };
  });

  // Filtered rows
  const filteredItems = createMemo(() => {
    const q = filterText().toLowerCase().trim();
    if (!q) return props.items.map((item, originalIndex) => ({ item, originalIndex }));

    return props.items
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(
        ({ item }) =>
          item.subActivity.toLowerCase().includes(q) ||
          item.hazard.toLowerCase().includes(q) ||
          item.impact.toLowerCase().includes(q) ||
          item.riskCategory.toLowerCase().includes(q)
      );
  });

  // Recalculate derived fields when P, S, or ECM values change
  const recalculate = (index: number, field: string, value: number | string) => {
    const newItems = [...props.items];
    const item = { ...newItems[index] };

    // Update the changed field
    if (field === "likelihoodP") item.likelihoodP = Number(value);
    else if (field === "severityDl") item.severityDl = Number(value);
    else if (field === "severitySl") item.severitySl = Number(value);
    else if (field === "severityCm") item.severityCm = Number(value);
    else if (field === "severityAs") item.severityAs = Number(value);
    else if (field === "ecmFactor") item.ecmFactor = Number(value);

    // Recalculate all derived values
    item.maxSeverity = calculateMaxSeverity(item.severityDl, item.severitySl, item.severityCm, item.severityAs);
    item.initialRiskScore = calculateInitialRisk(item.likelihoodP, item.maxSeverity);
    item.isSignificant = evaluateSignificance(item.regulations, item.initialRiskScore);
    item.residualRiskScore = calculateResidualRisk(item.initialRiskScore, item.ecmFactor);
    item.riskCategory = determineRiskCategory(item.residualRiskScore, item.maxSeverity);

    newItems[index] = item;
    props.onItemsChange(newItems);
  };

  const toggleRow = (index: number) => {
    setExpandedRow(expandedRow() === index ? null : index);
  };

  // Export as CSV
  const exportCsv = () => {
    const headers = [
      "No",
      "Sub Aktivitas",
      "K3/L (Kol 4)",
      "Kondisi (Kol 5)",
      "Potensi Bahaya (Kol 6)",
      "Regulasi K3 (Kol 7)",
      "Potensi Dampak (Kol 8)",
      "P (Kol 9)",
      "DL",
      "SL",
      "CM",
      "AS",
      "S Max (Kol 10)",
      "P x S (Kol 11)",
      "Aspek Penting (Kol 12)",
      "ECM (Kol 13)",
      "Bobot ECM (Kol 14)",
      "Risiko Residual (Kol 15)",
      "Kategori Risiko (Kol 16)",
      "Pengendalian Lanjutan (Kol 17)",
      "Respon Manajemen (Kol 18)",
    ];

    const rows = props.items.map((it, idx) => [
      idx + 1,
      `"${it.subActivity.replace(/"/g, '""')}"`,
      `"${it.k3Category}"`,
      `"${it.condition}"`,
      `"${it.hazard.replace(/"/g, '""')}"`,
      `"${it.regulations.replace(/"/g, '""')}"`,
      `"${it.impact.replace(/"/g, '""')}"`,
      it.likelihoodP,
      it.severityDl,
      it.severitySl,
      it.severityCm,
      it.severityAs,
      it.maxSeverity,
      it.initialRiskScore,
      `"${it.isSignificant}"`,
      `"${it.existingControl.replace(/"/g, '""')}"`,
      it.ecmFactor,
      it.residualRiskScore,
      `"${it.riskCategory}"`,
      `"${it.determiningControl.replace(/"/g, '""')}"`,
      `"${it.managementResponseCode}: ${it.managementResponseAction.replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `HIRADC_AutoHIRA_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div class="bg-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-800 flex flex-col max-h-[80vh]">
      {/* Top Banner & Stats */}
      <div class="px-6 py-5 border-b border-slate-800 bg-slate-950/50 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-sm">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div class="flex items-center gap-3">
              <h2 class="text-lg sm:text-xl font-bold text-white tracking-tight">
                Formulir HIRADC Standar FMKP 2023
              </h2>
              <span class="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                Kolom 4 — 18
              </span>
            </div>
            <p class="text-sm text-slate-400 mt-1">
              Evaluasi interaktif • Nilai matriks P, S, dan ECM dapat diedit secara inline
            </p>
          </div>
        </div>

        {/* Action Buttons & Quick Filter */}
        <div class="flex flex-wrap items-center gap-3">
          {/* Search box */}
          <div class="relative">
            <input
              type="text"
              class="w-full px-4 py-2 pl-9 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all min-w-[200px]"
              placeholder="Filter bahaya..."
              value={filterText()}
              onInput={(e) => setFilterText(e.currentTarget.value)}
            />
            <svg class="w-4 h-4 text-slate-500 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            class="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm font-semibold transition-colors border border-slate-700 shadow-sm"
            onClick={exportCsv}
            title="Download file CSV"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Ekspor CSV</span>
          </button>

          {/* Export Excel (.xlsx) Button */}
          <button
            type="button"
            class="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-md shadow-emerald-600/20"
            onClick={() => setIsExportModalOpen(true)}
            title="Download file Excel resmi format Form HIRADC"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Ekspor Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Analytics KPI Ribbon */}
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 px-6 py-4 bg-slate-950 border-b border-slate-800 text-sm shrink-0">
        <div class="flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-900 border border-slate-800">
          <span class="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span class="text-slate-400 font-medium">Total Item:</span>
          <span class="font-bold text-white ml-auto">{stats().total}</span>
        </div>

        <div class="flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-900 border border-slate-800">
          <span class="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span class="text-slate-400 font-medium">Aspek Penting:</span>
          <span class="font-bold text-rose-400 ml-auto">{stats().significant}</span>
        </div>

        <div class="flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-900 border border-slate-800">
          <span class="w-2.5 h-2.5 rounded-full bg-orange-500" />
          <span class="text-slate-400 font-medium">Risiko Tinggi:</span>
          <span class="font-bold text-orange-400 ml-auto">{stats().highRisk}</span>
        </div>

        <div class="flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-900 border border-slate-800">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span class="text-slate-400 font-medium">Terkendali:</span>
          <span class="font-bold text-emerald-400 ml-auto">{stats().total - stats().highRisk}</span>
        </div>
      </div>

      {/* Table Container with Grouped Header */}
      <div class="overflow-auto custom-scrollbar flex-1 relative bg-slate-950">
        <table class="w-full text-left border-collapse min-w-[1200px] text-sm">
          <thead class="sticky top-0 z-20">
            {/* Top Category Tier */}
            <tr class="text-xs uppercase font-bold tracking-wider text-slate-400 border-b border-slate-700 bg-slate-900 shadow-sm">
              <th colspan={7} class="px-5 py-3 text-left bg-slate-900 border-r border-slate-700 text-blue-400">
                1. Identifikasi Bahaya & Regulasi (Kolom 4 — 8)
              </th>
              <th colspan={7} class="px-5 py-3 text-center bg-slate-900 border-r border-slate-700 text-amber-400">
                2. Evaluasi Risiko Awal (Kolom 9 — 12)
              </th>
              <th colspan={4} class="px-5 py-3 text-center bg-slate-900 text-emerald-400 border-r border-slate-700">
                3. Evaluasi Risiko Residual (Kolom 14 — 16)
              </th>
              <th class="px-3 py-3 text-center bg-slate-900">Aksi</th>
            </tr>

            {/* Individual Columns */}
            <tr class="text-xs font-bold text-slate-300 bg-slate-900 border-b border-slate-700 shadow-md">
              <th class="px-4 py-3 text-left w-12 font-mono text-slate-500">#</th>
              <th class="px-4 py-3 text-left min-w-[200px]">Sub-Aktivitas</th>
              <th class="px-3 py-3 text-center w-16">
                K3/L
                <div class="text-[10px] font-normal text-slate-500 font-mono mt-1">Kol. 4</div>
              </th>
              <th class="px-3 py-3 text-center w-24">
                Kondisi
                <div class="text-[10px] font-normal text-slate-500 font-mono mt-1">Kol. 5</div>
              </th>
              <th class="px-4 py-3 text-left min-w-[220px]">
                Potensi Bahaya
                <div class="text-[10px] font-normal text-slate-500 font-mono mt-1">Kol. 6</div>
              </th>
              <th class="px-4 py-3 text-left min-w-[180px]">
                Regulasi K3
                <div class="text-[10px] font-normal text-slate-500 font-mono mt-1">Kol. 7</div>
              </th>
              <th class="px-4 py-3 text-left min-w-[200px] border-r border-slate-700">
                Potensi Dampak
                <div class="text-[10px] font-normal text-slate-500 font-mono mt-1">Kol. 8</div>
              </th>

              {/* Risiko Awal Columns */}
              <th class="px-2 py-3 text-center w-14 bg-amber-950/20 text-amber-400">
                P
                <div class="text-[10px] font-normal text-amber-500/70 font-mono mt-1">Kol. 9</div>
              </th>
              <th class="px-2 py-3 text-center w-14 bg-amber-950/20 text-amber-300">DL</th>
              <th class="px-2 py-3 text-center w-14 bg-amber-950/20 text-amber-300">SL</th>
              <th class="px-2 py-3 text-center w-14 bg-amber-950/20 text-amber-300">CM</th>
              <th class="px-2 py-3 text-center w-14 bg-amber-950/20 text-amber-300">AS</th>
              <th class="px-3 py-3 text-center w-16 bg-amber-950/30 text-blue-400 font-mono">
                S<sub>max</sub>
                <div class="text-[10px] font-normal text-blue-500/70 mt-1">Kol. 10</div>
              </th>
              <th class="px-3 py-3 text-center w-16 bg-amber-950/30 text-amber-400 font-mono border-r border-slate-700">
                P×S
                <div class="text-[10px] font-normal text-amber-500/70 mt-1">Kol. 11</div>
              </th>

              {/* Aspek Penting */}
              <th class="px-3 py-3 text-center w-24 border-r border-slate-700">
                Aspek
                <div class="text-[10px] font-normal text-slate-500 font-mono mt-1">Kol. 12</div>
              </th>

              {/* Residual */}
              <th class="px-2 py-3 text-center w-16 bg-emerald-950/20 text-emerald-400">
                ECM
                <div class="text-[10px] font-normal text-emerald-500/70 font-mono mt-1">Kol. 14</div>
              </th>
              <th class="px-3 py-3 text-center w-16 bg-emerald-950/30 text-purple-400 font-mono">
                Risiko
                <div class="text-[10px] font-normal text-purple-500/70 mt-1">Kol. 15</div>
              </th>
              <th class="px-4 py-3 text-center w-32 bg-emerald-950/20 text-emerald-300 border-r border-slate-700">
                Kategori
                <div class="text-[10px] font-normal text-emerald-500/70 font-mono mt-1">Kol. 16</div>
              </th>

              {/* Detail toggle */}
              <th class="px-3 py-3 text-center w-14">Detail</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-800/60">
            <For each={filteredItems()}>
              {({ item, originalIndex }) => (
                <>
                  <tr class="hover:bg-slate-900 transition-colors group">
                    <td class="px-4 py-4 text-slate-500 font-mono font-medium">{originalIndex + 1}</td>
                    <td class="px-4 py-4 text-slate-200 font-medium">{item.subActivity}</td>
                    
                    <td class="px-3 py-4 text-center">
                      <span class="px-2.5 py-1 rounded-md bg-slate-800 text-cyan-400 border border-slate-700 font-mono text-xs font-bold">
                        {item.k3Category}
                      </span>
                    </td>
                    
                    <td class="px-3 py-4 text-center">
                      <span class="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs font-medium">
                        {item.condition}
                      </span>
                    </td>

                    <td class="px-4 py-4 text-slate-300">
                      <div class="line-clamp-3 leading-relaxed">{item.hazard}</div>
                    </td>

                    <td class="px-4 py-4 text-slate-400">
                      <div class="text-xs line-clamp-3 leading-relaxed font-mono">{item.regulations || "—"}</div>
                    </td>

                    <td class="px-4 py-4 text-slate-300 border-r border-slate-800/60">
                      <div class="line-clamp-3 leading-relaxed">{item.impact}</div>
                    </td>

                    {/* Editable: P */}
                    <td class="px-2 py-4 text-center bg-amber-950/5">
                      <select
                        class="w-full bg-slate-900 border border-amber-500/30 text-amber-400 text-center rounded py-1 px-1 text-sm font-bold appearance-none cursor-pointer hover:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                        value={item.likelihoodP}
                        onChange={(e) => recalculate(originalIndex, "likelihoodP", e.currentTarget.value)}
                        title="Peluang / Likelihood (1 - 5)"
                      >
                        <For each={[1, 2, 3, 4, 5]}>
                          {(v) => <option value={v} class="bg-slate-900 text-white">{v}</option>}
                        </For>
                      </select>
                    </td>

                    {/* Editable: DL */}
                    <td class="px-2 py-4 text-center bg-amber-950/5">
                      <select
                        class="w-full bg-slate-900 border border-slate-700 text-slate-300 text-center rounded py-1 px-1 text-sm font-medium appearance-none cursor-pointer hover:border-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                        value={item.severityDl}
                        onChange={(e) => recalculate(originalIndex, "severityDl", e.currentTarget.value)}
                        title="Dampak Lingkungan (1 - 5)"
                      >
                        <For each={[1, 2, 3, 4, 5]}>
                          {(v) => <option value={v} class="bg-slate-900 text-white">{v}</option>}
                        </For>
                      </select>
                    </td>

                    {/* Editable: SL */}
                    <td class="px-2 py-4 text-center bg-amber-950/5">
                      <select
                        class="w-full bg-slate-900 border border-slate-700 text-slate-300 text-center rounded py-1 px-1 text-sm font-medium appearance-none cursor-pointer hover:border-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                        value={item.severitySl}
                        onChange={(e) => recalculate(originalIndex, "severitySl", e.currentTarget.value)}
                        title="Sosial & Legal (1 - 5)"
                      >
                        <For each={[1, 2, 3, 4, 5]}>
                          {(v) => <option value={v} class="bg-slate-900 text-white">{v}</option>}
                        </For>
                      </select>
                    </td>

                    {/* Editable: CM */}
                    <td class="px-2 py-4 text-center bg-amber-950/5">
                      <select
                        class="w-full bg-slate-900 border border-slate-700 text-slate-300 text-center rounded py-1 px-1 text-sm font-medium appearance-none cursor-pointer hover:border-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                        value={item.severityCm}
                        onChange={(e) => recalculate(originalIndex, "severityCm", e.currentTarget.value)}
                        title="Citra Media (1 - 5)"
                      >
                        <For each={[1, 2, 3, 4, 5]}>
                          {(v) => <option value={v} class="bg-slate-900 text-white">{v}</option>}
                        </For>
                      </select>
                    </td>

                    {/* Editable: AS */}
                    <td class="px-2 py-4 text-center bg-amber-950/5">
                      <select
                        class="w-full bg-slate-900 border border-slate-700 text-slate-300 text-center rounded py-1 px-1 text-sm font-medium appearance-none cursor-pointer hover:border-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                        value={item.severityAs}
                        onChange={(e) => recalculate(originalIndex, "severityAs", e.currentTarget.value)}
                        title="Aset / Biaya Finansial (1 - 5)"
                      >
                        <For each={[1, 2, 3, 4, 5]}>
                          {(v) => <option value={v} class="bg-slate-900 text-white">{v}</option>}
                        </For>
                      </select>
                    </td>

                    {/* Calculated S_max */}
                    <td class="px-3 py-4 text-center font-bold text-blue-400 font-mono text-base bg-amber-950/10">
                      {item.maxSeverity}
                    </td>

                    {/* Calculated P×S */}
                    <td class="px-3 py-4 text-center font-bold text-amber-400 font-mono text-base bg-amber-950/10 border-r border-slate-800/60">
                      {item.initialRiskScore}
                    </td>

                    {/* Aspek Penting */}
                    <td class="px-3 py-4 text-center border-r border-slate-800/60">
                      <span
                        class={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                          item.isSignificant === "Penting"
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {item.isSignificant}
                      </span>
                    </td>

                    {/* Editable: ECM Factor */}
                    <td class="px-2 py-4 text-center bg-emerald-950/5">
                      <select
                        class="w-full bg-slate-900 border border-emerald-500/30 text-emerald-400 text-center rounded py-1 px-1 text-sm font-bold appearance-none cursor-pointer hover:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                        value={item.ecmFactor}
                        onChange={(e) => recalculate(originalIndex, "ecmFactor", e.currentTarget.value)}
                        title="Existing Control Measure Factor (0.1 - 1.0)"
                      >
                        <For each={[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]}>
                          {(v) => (
                            <option value={v} class="bg-slate-900 text-white">
                              {v.toFixed(1)}
                            </option>
                          )}
                        </For>
                      </select>
                    </td>

                    {/* Calculated Residual Risk */}
                    <td class="px-3 py-4 text-center font-bold text-purple-400 font-mono text-base bg-emerald-950/10">
                      {item.residualRiskScore}
                    </td>

                    {/* Risk Category */}
                    <td class="px-4 py-4 text-center border-r border-slate-800/60">
                      <RiskBadge category={item.riskCategory} />
                    </td>

                    {/* Expand Detail Button */}
                    <td class="px-3 py-4 text-center">
                      <button
                        type="button"
                        class={`w-8 h-8 rounded-lg flex items-center justify-center transition-all mx-auto ${
                          expandedRow() === originalIndex
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                            : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                        }`}
                        onClick={() => toggleRow(originalIndex)}
                        title="Lihat Kolom 13, 17, 18"
                      >
                        <svg
                          class={`w-5 h-5 transition-transform duration-200 ${
                            expandedRow() === originalIndex ? "rotate-180" : ""
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          stroke-width={2}
                        >
                          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Detail Drawer */}
                  <Show when={expandedRow() === originalIndex}>
                    <tr class="bg-slate-900 border-b-2 border-blue-600 shadow-inner">
                      <td colspan={20} class="p-6 md:p-8">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Kolom 13 */}
                          <div class="p-5 rounded-xl bg-slate-950 border border-slate-800">
                            <div class="flex items-center gap-2 mb-3">
                              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                              <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                Kolom 13 — Pengendalian Saat Ini (ECM)
                              </h4>
                            </div>
                            <p class="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">
                              {item.existingControl || "Tidak ada data pengendalian saat ini."}
                            </p>
                          </div>

                          {/* Kolom 17 */}
                          <div class="p-5 rounded-xl bg-slate-950 border border-slate-800">
                            <div class="flex items-center gap-2 mb-3">
                              <span class="w-2.5 h-2.5 rounded-full bg-blue-500" />
                              <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                Kolom 17 — Pengendalian Risiko Lanjutan
                              </h4>
                            </div>
                            <p class="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">
                              {item.determiningControl || "Tidak ada rekomendasi pengendalian lanjutan."}
                            </p>
                          </div>

                          {/* Kolom 18 */}
                          <div class="p-5 rounded-xl bg-slate-950 border border-slate-800">
                            <div class="flex items-center gap-2 mb-3">
                              <span class="w-2.5 h-2.5 rounded-full bg-purple-500" />
                              <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                Kolom 18 — Respon Manajemen
                              </h4>
                            </div>
                            <div class="space-y-3">
                              <div class="flex items-center gap-3">
                                <span class="px-3 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm font-bold font-mono">
                                  {item.managementResponseCode || "T-1"}
                                </span>
                                <span class="text-sm text-slate-500 font-medium">Tingkat Tindakan</span>
                              </div>
                              <p class="text-sm text-slate-400 leading-relaxed">
                                {item.managementResponseAction || "Segera tindak lanjuti mitigasi risiko sesuai SOP K3."}
                              </p>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </Show>
                </>
              )}
            </For>
          </tbody>
        </table>
      </div>

      {/* Modal Ekspor Excel FMKP HIRADC */}
      <ExcelExportModal
        isOpen={isExportModalOpen()}
        onClose={() => setIsExportModalOpen(false)}
        items={props.items}
        activityInfo={props.activityInfo}
      />
    </div>
  );
}
