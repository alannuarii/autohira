import { createSignal, Show, createEffect } from "solid-js";
import type { HiraItem } from "./HiraTable";

interface ExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: HiraItem[];
  activityInfo?: {
    title: string;
    unit: string;
    location: string;
    supervisor: string;
    docNumber?: string;
  } | null;
}

export default function ExcelExportModal(props: ExcelExportModalProps) {
  const currentDateStr = () =>
    new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  // Header State
  const [unit, setUnit] = createSignal("UP Minahasa / ULPLTD Tahuna");
  const [noDokumen, setNoDokumen] = createSignal("IKMH-314-10.3.3.a-030F");
  const [divisiAktivitas, setDivisiAktivitas] = createSignal("");
  const [noRevisi, setNoRevisi] = createSignal("01");
  const [lokasi, setLokasi] = createSignal("Power House");
  const [tglTerbit, setTglTerbit] = createSignal(currentDateStr());
  const [penanggungJawab, setPenanggungJawab] = createSignal("Team Leader Pemeliharaan");

  // Sign-off State
  const [dibuatNama, setDibuatNama] = createSignal("Alan Nuari");
  const [dibuatJabatan, setDibuatJabatan] = createSignal("Team Leader Pemeliharaan");
  const [dibuatTanggal, setDibuatTanggal] = createSignal(currentDateStr());

  const [diperiksaNama, setDiperiksaNama] = createSignal("Jamal Idris");
  const [diperiksaJabatan, setDiperiksaJabatan] = createSignal("Manager ULPLTD Tahuna");
  const [diperiksaTanggal, setDiperiksaTanggal] = createSignal(currentDateStr());

  const [disahkanNama, setDisahkanNama] = createSignal("Aries Indrianto Elisa");
  const [disahkanJabatan, setDisahkanJabatan] = createSignal("Manager UP Minahasa");
  const [disahkanTanggal, setDisahkanTanggal] = createSignal(currentDateStr());

  const [isExporting, setIsExporting] = createSignal(false);
  const [errorMsg, setErrorMsg] = createSignal<string | null>(null);

  // Sync initial values when modal opens or activityInfo changes
  const initDefaults = () => {
    const act = props.activityInfo;
    if (act?.unit) setUnit(act.unit);
    if (act?.title) setDivisiAktivitas(act.title);
    if (act?.location) setLokasi(act.location);
    if (act?.supervisor) {
      setPenanggungJawab(act.supervisor);
      setDibuatNama(act.supervisor.replace(/-\s*Team Leader.*/i, "").trim());
    }
    if (act?.docNumber) {
      setNoDokumen(act.docNumber);
    }
    setTglTerbit(currentDateStr());
    setDibuatTanggal(currentDateStr());
    setDiperiksaTanggal(currentDateStr());
    setDisahkanTanggal(currentDateStr());
  };

  // Re-sync whenever the modal is opened
  createEffect(() => {
    if (props.isOpen) {
      initDefaults();
    }
  });

  const handleDownload = async () => {
    setIsExporting(true);
    setErrorMsg(null);

    try {
      const payload = {
        header: {
          unit: unit(),
          noDokumen: noDokumen(),
          divisiAktivitas: divisiAktivitas(),
          noRevisi: noRevisi(),
          lokasi: lokasi(),
          tglTerbit: tglTerbit(),
          penanggungJawab: penanggungJawab(),
        },
        signOff: {
          dibuatNama: dibuatNama(),
          dibuatJabatan: dibuatJabatan(),
          dibuatTanggal: dibuatTanggal(),
          diperiksaNama: diperiksaNama(),
          diperiksaJabatan: diperiksaJabatan(),
          diperiksaTanggal: diperiksaTanggal(),
          disahkanNama: disahkanNama(),
          disahkanJabatan: disahkanJabatan(),
          disahkanTanggal: disahkanTanggal(),
        },
        items: props.items,
        mainActivityTitle: props.activityInfo?.title || divisiAktivitas(),
      };

      const res = await fetch("/api/export-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal membuat file Excel");
      }

      // Download file dari blob
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FMKP_HIRADC_${(unit() || "PLN").replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      props.onClose();
    } catch (err: any) {
      console.error("Export Excel client error:", err);
      setErrorMsg(err.message || "Terjadi kesalahan saat mengunduh file.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
        {/* Backdrop click */}
        <div
          class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Modal */}
          <div class="px-6 py-5 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-white tracking-tight">
                  Ekspor Dokumen Excel FMKP HIRADC
                </h3>
                <p class="text-xs text-slate-400">
                  Isi parameter dokumen dan tanda tangan pengesahan sebelum mengunduh format .xlsx resmi.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={props.onClose}
              class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Body Modal (Scrollable) */}
          <div class="p-6 overflow-y-auto space-y-6 custom-scrollbar text-sm">
            {/* Error Banner */}
            <Show when={errorMsg()}>
              <div class="p-4 rounded-xl bg-rose-950/80 border border-rose-500/30 text-rose-300 text-xs">
                {errorMsg()}
              </div>
            </Show>

            {/* Section 1: Header Dokumen */}
            <div class="bg-slate-950/50 p-5 rounded-xl border border-slate-800/80 space-y-4">
              <div class="flex items-center gap-2 border-b border-slate-800 pb-2">
                <span class="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <h4 class="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  1. Informasi Header Dokumen (Nilai Pengganti XXX)
                </h4>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-400 mb-1">
                    Unit Pelaksana
                  </label>
                  <input
                    type="text"
                    class="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                    value={unit()}
                    onInput={(e) => setUnit(e.currentTarget.value)}
                    placeholder="UP Minahasa / ULPLTD Tahuna"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-400 mb-1">
                    No. Dokumen
                  </label>
                  <input
                    type="text"
                    class="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                    value={noDokumen()}
                    onInput={(e) => setNoDokumen(e.currentTarget.value)}
                    placeholder="IKMH-314-10.3.3.a-036F"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-400 mb-1">
                    Divisi / Bidang / Aktivitas
                  </label>
                  <input
                    type="text"
                    class="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                    value={divisiAktivitas()}
                    onInput={(e) => setDivisiAktivitas(e.currentTarget.value)}
                    placeholder="ULPLTD Tahuna / Pemeliharaan Rutin P5 Mesin Cummins"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-400 mb-1">
                    No. Revisi
                  </label>
                  <input
                    type="text"
                    class="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                    value={noRevisi()}
                    onInput={(e) => setNoRevisi(e.currentTarget.value)}
                    placeholder="01"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-400 mb-1">
                    Area / Lokasi
                  </label>
                  <input
                    type="text"
                    class="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                    value={lokasi()}
                    onInput={(e) => setLokasi(e.currentTarget.value)}
                    placeholder="Power House / Ruang Mesin Unit 8"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-400 mb-1">
                    Tanggal Terbit
                  </label>
                  <input
                    type="text"
                    class="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                    value={tglTerbit()}
                    onInput={(e) => setTglTerbit(e.currentTarget.value)}
                    placeholder="20 September 2026"
                  />
                </div>

                <div class="md:col-span-2">
                  <label class="block text-xs font-semibold text-slate-400 mb-1">
                    Penanggung Jawab
                  </label>
                  <input
                    type="text"
                    class="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                    value={penanggungJawab()}
                    onInput={(e) => setPenanggungJawab(e.currentTarget.value)}
                    placeholder="Team Leader Pemeliharaan"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Blok Pengesahan (Sign-Off) */}
            <div class="bg-slate-950/50 p-5 rounded-xl border border-slate-800/80 space-y-4">
              <div class="flex items-center gap-2 border-b border-slate-800 pb-2">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h4 class="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  2. Kolom Persetujuan & Tanda Tangan (Footer Excel)
                </h4>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Dibuat Oleh */}
                <div class="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
                  <div class="text-xs font-bold text-blue-400 border-b border-slate-800 pb-1">
                    Dibuat Oleh
                  </div>
                  <div>
                    <label class="block text-[11px] text-slate-400 mb-1">Nama</label>
                    <input
                      type="text"
                      class="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-white text-xs"
                      value={dibuatNama()}
                      onInput={(e) => setDibuatNama(e.currentTarget.value)}
                      placeholder="Nama Lengkap"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] text-slate-400 mb-1">Jabatan</label>
                    <input
                      type="text"
                      class="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-white text-xs"
                      value={dibuatJabatan()}
                      onInput={(e) => setDibuatJabatan(e.currentTarget.value)}
                      placeholder="Team Leader Pemeliharaan"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] text-slate-400 mb-1">Tanggal</label>
                    <input
                      type="text"
                      class="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-white text-xs"
                      value={dibuatTanggal()}
                      onInput={(e) => setDibuatTanggal(e.currentTarget.value)}
                    />
                  </div>
                </div>

                {/* Diperiksa Oleh */}
                <div class="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
                  <div class="text-xs font-bold text-amber-400 border-b border-slate-800 pb-1">
                    Diperiksa Oleh
                  </div>
                  <div>
                    <label class="block text-[11px] text-slate-400 mb-1">Nama</label>
                    <input
                      type="text"
                      class="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-white text-xs"
                      value={diperiksaNama()}
                      onInput={(e) => setDiperiksaNama(e.currentTarget.value)}
                      placeholder="Nama Lengkap"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] text-slate-400 mb-1">Jabatan</label>
                    <input
                      type="text"
                      class="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-white text-xs"
                      value={diperiksaJabatan()}
                      onInput={(e) => setDiperiksaJabatan(e.currentTarget.value)}
                      placeholder="Manager ULPLTD Tahuna"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] text-slate-400 mb-1">Tanggal</label>
                    <input
                      type="text"
                      class="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-white text-xs"
                      value={diperiksaTanggal()}
                      onInput={(e) => setDiperiksaTanggal(e.currentTarget.value)}
                    />
                  </div>
                </div>

                {/* Disahkan Oleh */}
                <div class="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
                  <div class="text-xs font-bold text-emerald-400 border-b border-slate-800 pb-1">
                    Disahkan Oleh
                  </div>
                  <div>
                    <label class="block text-[11px] text-slate-400 mb-1">Nama</label>
                    <input
                      type="text"
                      class="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-white text-xs"
                      value={disahkanNama()}
                      onInput={(e) => setDisahkanNama(e.currentTarget.value)}
                      placeholder="Nama Lengkap"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] text-slate-400 mb-1">Jabatan</label>
                    <input
                      type="text"
                      class="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-white text-xs"
                      value={disahkanJabatan()}
                      onInput={(e) => setDisahkanJabatan(e.currentTarget.value)}
                      placeholder="Manager UP Minahasa"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] text-slate-400 mb-1">Tanggal</label>
                    <input
                      type="text"
                      class="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-white text-xs"
                      value={disahkanTanggal()}
                      onInput={(e) => setDisahkanTanggal(e.currentTarget.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Ringkasan Item yang akan diekspor */}
            <div class="p-4 rounded-lg bg-blue-950/20 border border-blue-500/20 flex items-center justify-between text-xs text-blue-300">
              <span>Total baris analisis yang akan diekspor:</span>
              <span class="font-bold font-mono text-sm text-white">{props.items.length} Baris HIRADC</span>
            </div>
          </div>

          {/* Footer Modal Actions */}
          <div class="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={props.onClose}
              disabled={isExporting()}
              class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting() || props.items.length === 0}
              class="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting() ? (
                <>
                  <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
                  </svg>
                  <span>Mengekspor Excel...</span>
                </>
              ) : (
                <>
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Unduh File Excel (.xlsx)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
