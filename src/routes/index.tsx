import { createSignal, Show } from "solid-js";
import { Title } from "@solidjs/meta";
import TopBar from "~/components/TopBar";
import GeneratorForm from "~/components/GeneratorForm";
import HiraTable, { type HiraItem } from "~/components/HiraTable";
import ActivityHistory from "~/components/ActivityHistory";

export default function Home() {
  const [items, setItems] = createSignal<HiraItem[]>([]);
  const [activityInfo, setActivityInfo] = createSignal<{
    id?: number;
    title: string;
    docNumber?: string;
    unit: string;
    location: string;
    supervisor: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = createSignal(false);
  const [ikProgress, setIkProgress] = createSignal<{ current: number; total: number } | null>(null);
  const [isSaving, setIsSaving] = createSignal(false);
  const [toast, setToast] = createSignal<{ message: string; type: "success" | "error" } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = createSignal(0);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Helper simpan otomatis ke database
  const autoSaveToDatabase = async (activity: any, itemsToSave: any[]) => {
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity,
          items: itemsToSave,
        }),
      });

      const result = await res.json();
      if (res.ok && result.data?.activity) {
        setActivityInfo((prev) => prev ? { ...prev, id: result.data.activity.id } : prev);
        setRefreshTrigger((prev) => prev + 1);
        console.log("Auto-saved to database:", result.data.activity.id);
      }
    } catch (err) {
      console.error("Auto-save error:", err);
    }
  };

  const handleGenerate = async (data: {
    activity: string;
    unit: string;
    location: string;
    supervisor: string;
  }) => {
    setIsGenerating(true);
    setIkProgress(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Gagal generate HIRA");
      }

      setActivityInfo(result.activity);
      setItems(result.items);
      showToast(`Berhasil menyusun ${result.items.length} item analisis HIRADC & otomatis tersimpan`);

      // Simpan otomatis ke database
      autoSaveToDatabase(result.activity, result.items);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan";
      showToast(message, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateIkStart = () => {
    setIsGenerating(true);
    setIkProgress(null);
  };

  const handleGenerateIkProgress = (current: number, total: number) => {
    setIkProgress({ current, total });
  };

  const handleGenerateIkComplete = (data: any) => {
    setActivityInfo(data.activity);
    setItems(data.items);
    showToast(`Berhasil menyusun ${data.items.length} item analisis HIRADC & otomatis tersimpan`);
    setIsGenerating(false);
    setIkProgress(null);

    // Simpan otomatis ke database
    autoSaveToDatabase(data.activity, data.items);
  };

  const handleGenerateIkError = (error: string) => {
    showToast(error, "error");
    setIsGenerating(false);
    setIkProgress(null);
  };

  const handleSave = async () => {
    if (!activityInfo() || items().length === 0) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity: activityInfo(),
          items: items(),
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Gagal menyimpan");
      }

      if (result.data?.activity) {
        setActivityInfo((prev) => prev ? { ...prev, id: result.data.activity.id } : prev);
      }

      showToast("Data HIRADC berhasil disimpan ke database PostgreSQL!");
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan";
      showToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadActivity = async (activityId: number) => {
    try {
      const res = await fetch(`/api/activities/${activityId}`);
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Gagal memuat data");
      }

      const { activity, items: loadedItems } = result.data;
      setActivityInfo({
        id: activity.id,
        title: activity.title,
        docNumber: activity.docNumber || "",
        unit: activity.unit || "",
        location: activity.location || "",
        supervisor: activity.supervisor || "",
      });
      setItems(loadedItems);
      showToast(`Memuat dokumen dari database: "${activity.title}" (${loadedItems.length} sub-aktivitas)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan";
      showToast(message, "error");
    }
  };

  return (
    <div class="min-h-screen flex flex-col relative selection:bg-blue-500/30 selection:text-white bg-slate-950 text-slate-50">
      <Title>AutoHIRA • Automated HIRADC Platform</Title>
      
      {/* Background ambient lighting - replaced with pure tailwind */}
      <div class="absolute top-0 left-1/4 -translate-x-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div class="absolute top-40 right-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navigation */}
      <TopBar />

      <main class="max-w-[1800px] w-full mx-auto px-6 lg:px-12 py-8 space-y-8 flex-1 relative z-10">
        {/* Top Control Grid: Generator (left 2 cols) & Archives (right 1 col) */}
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div class="lg:col-span-2 flex flex-col">
            <GeneratorForm 
              onGenerate={handleGenerate} 
              onGenerateIkStart={handleGenerateIkStart}
              onGenerateIkProgress={handleGenerateIkProgress}
              onGenerateIkComplete={handleGenerateIkComplete}
              onGenerateIkError={handleGenerateIkError}
              onRequestUseExisting={handleLoadActivity}
              isLoading={isGenerating()} 
              ikProgress={ikProgress()}
            />
          </div>

          <div class="lg:col-span-1 flex flex-col">
            <ActivityHistory onLoad={handleLoadActivity} refreshTrigger={refreshTrigger()} />
          </div>
        </div>

        {/* Active Document Header Bar */}
        <Show when={activityInfo()}>
          <div class="bg-slate-900 rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-lg">
            <div class="flex items-start md:items-center gap-4">
              <div class="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <div class="flex flex-wrap items-center gap-3">
                  <h3 class="text-xl font-bold text-white tracking-tight">{activityInfo()!.title}</h3>
                  <span class="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                    {items().length} Temuan Bahaya
                  </span>
                </div>
                <div class="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-400">
                  <span class="flex items-center gap-1.5">
                    <span class="text-slate-500 font-medium">Unit:</span> {activityInfo()!.unit}
                  </span>
                  <span class="text-slate-700">•</span>
                  <span class="flex items-center gap-1.5">
                    <span class="text-slate-500 font-medium">Lokasi:</span> {activityInfo()!.location}
                  </span>
                  <span class="text-slate-700">•</span>
                  <span class="flex items-center gap-1.5">
                    <span class="text-slate-500 font-medium">Pengawas:</span> {activityInfo()!.supervisor}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div class="flex items-center gap-3 self-end md:self-auto shrink-0">
              <button
                type="button"
                class="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                onClick={handleSave}
                disabled={isSaving() || items().length === 0}
              >
                {isSaving() ? (
                  <>
                    <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
                    </svg>
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    <span>Simpan ke Database</span>
                  </>
                )}
              </button>

              <button
                type="button"
                class="bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors border border-slate-700"
                onClick={() => {
                  setItems([]);
                  setActivityInfo(null);
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </Show>

        {/* Generated Data Grid */}
        <Show when={items().length > 0}>
          <HiraTable items={items()} onItemsChange={setItems} activityInfo={activityInfo()} />
        </Show>

        {/* Empty State / Methodology Showcase */}
        <Show when={items().length === 0 && !isGenerating()}>
          <div class="bg-slate-900 rounded-2xl p-10 border border-slate-800 shadow-xl relative overflow-hidden">
            {/* Header */}
            <div class="text-center max-w-3xl mx-auto mb-10">
              <h3 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
                Metodologi HIRADC & Evaluasi Risiko K3
              </h3>
              <p class="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
                Standar identifikasi bahaya, penilaian risiko matriks 5×5, dan penyusunan hierarki pengendalian risiko pemeliharaan pembangkit listrik PT PLN Nusantara Power.
              </p>
            </div>

            {/* 4 Detailed Criteria Cards */}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Matriks Risiko 5x5 PJB & Kriteria S_max */}
              <div class="bg-slate-950/60 rounded-2xl p-6 border border-slate-800 hover:border-blue-500/40 transition-colors shadow-sm space-y-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 class="text-base font-bold text-white">1. Matriks Risiko 5×5 & Kriteria Keparahan (S)</h4>
                    <span class="text-[11px] font-mono text-blue-400">Perdir No 0006.P019DIR2022 • SK Pedoman Manrisk PJB</span>
                  </div>
                </div>
                <p class="text-xs text-slate-400 leading-relaxed">
                  Menghitung Peluang <code class="text-blue-300 font-mono">P (1–5)</code> dikalikan Keparahan Maksimum <code class="text-blue-300 font-mono">S_max = MAX(DL, SL, CM, AS)</code>:
                </p>
                <div class="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div class="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span class="font-bold text-slate-200 block mb-0.5">🌿 DL (Dampak Lingkungan)</span>
                    <span class="text-slate-400 text-[11px]">Skala 1–5: Dari pembinaan s/d sanksi pencabutan izin & pencemaran parah.</span>
                  </div>
                  <div class="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span class="font-bold text-slate-200 block mb-0.5">🦺 SL (Keselamatan Jiwa)</span>
                    <span class="text-slate-400 text-[11px]">Skala 1–5: Rawat jalan, cedera berat, cacat permanen, hingga fatality.</span>
                  </div>
                  <div class="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span class="font-bold text-slate-200 block mb-0.5">📢 CM (Citra / Kepatuhan)</span>
                    <span class="text-slate-400 text-[11px]">Skala 1–5: Komplain non-key, teguran hukum, s/d sanksi pidana & unjuk rasa.</span>
                  </div>
                  <div class="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span class="font-bold text-slate-200 block mb-0.5">🏭 AS (Aset & Finansial)</span>
                    <span class="text-slate-400 text-[11px]">Skala 1–5: &lt;500 juta, perbaikan ringan, s/d &gt;200 Milyar & unit trip/blackout.</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Evaluasi Aspek Penting */}
              <div class="bg-slate-950/60 rounded-2xl p-6 border border-slate-800 hover:border-amber-500/40 transition-colors shadow-sm space-y-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h4 class="text-base font-bold text-white">2. Evaluasi Aspek Penting (Kolom 12)</h4>
                    <span class="text-[11px] font-mono text-amber-400">Formula FMKP: IF((Regulasi="") AND (PxS &lt; 15), "Tidak Penting", "Penting")</span>
                  </div>
                </div>
                <p class="text-xs text-slate-400 leading-relaxed">
                  Penentuan apakah suatu bahaya diklasifikasikan sebagai <strong class="text-amber-300">Aspek Penting</strong> atau <strong class="text-slate-400">Tidak Penting</strong> ditentukan oleh dua kondisi wajib:
                </p>
                <div class="space-y-2 text-xs pt-1">
                  <div class="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-start gap-2.5">
                    <span class="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold shrink-0 mt-0.5">Kondisi 1</span>
                    <p class="text-slate-300 text-[11px] leading-relaxed">
                      <strong>Terdapat Regulasi K3/L:</strong> Jika aktivitas dipayungi oleh regulasi (UU No. 1/1970, Permenaker K3 Listrik, dll), maka otomatis berstatus <strong>PENTING</strong> berapapun nilai risikonya.
                    </p>
                  </div>
                  <div class="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-start gap-2.5">
                    <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold shrink-0 mt-0.5">Kondisi 2</span>
                    <p class="text-slate-300 text-[11px] leading-relaxed">
                      <strong>Skor Risiko Awal:</strong> Bila tidak ada regulasi khusus, aktivitas bernilai <code class="text-amber-300 font-mono">PxS &ge; 15</code> tetap berstatus <strong>PENTING</strong>. Hanya bernilai "Tidak Penting" jika tanpa regulasi DAN PxS &lt; 15.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 3: Efektivitas Kontrol (ECM) & Risiko Residual */}
              <div class="bg-slate-950/60 rounded-2xl p-6 border border-slate-800 hover:border-emerald-500/40 transition-colors shadow-sm space-y-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h4 class="text-base font-bold text-white">3. Faktor ECM & Risiko Akhir (Kolom 13–15)</h4>
                    <span class="text-[11px] font-mono text-emerald-400">Formula FMKP: ROUNDUP(Risiko Awal × Faktor ECM, 0)</span>
                  </div>
                </div>
                <p class="text-xs text-slate-400 leading-relaxed">
                  Penilaian efektivitas pengendalian yang ada saat ini (Existing Control Measure) mengacu pada lembar standar efektivitas kontrol:
                </p>
                <div class="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                  <div class="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span class="text-emerald-400 font-mono font-bold block text-sm">0.1 – 0.2</span>
                    <span class="text-slate-400 text-[10px] block mt-0.5">Sangat Efektif</span>
                    <span class="text-[9px] text-slate-500">Rekayasa + Prosedur + APD lengkap</span>
                  </div>
                  <div class="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span class="text-yellow-400 font-mono font-bold block text-sm">0.3 – 0.5</span>
                    <span class="text-slate-400 text-[10px] block mt-0.5">Cukup Efektif</span>
                    <span class="text-[9px] text-slate-500">IK / Rambu / APD parsial</span>
                  </div>
                  <div class="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span class="text-rose-400 font-mono font-bold block text-sm">0.6 – 1.0</span>
                    <span class="text-slate-400 text-[10px] block mt-0.5">Kurang Efektif</span>
                    <span class="text-[9px] text-slate-500">Belum ada kontrol baku / APD saja</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Kategori Risiko & Respon Manajemen */}
              <div class="bg-slate-950/60 rounded-2xl p-6 border border-slate-800 hover:border-purple-500/40 transition-colors shadow-sm space-y-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <h4 class="text-base font-bold text-white">4. Kategori Risiko & Respon Manajemen</h4>
                    <span class="text-[11px] font-mono text-purple-400">Formula FMKP: Matriks Sel U14 & Kode Respon T-1 s/d T-4</span>
                  </div>
                </div>
                <p class="text-xs text-slate-400 leading-relaxed">
                  Kombinasi skor Tingkat Risiko Akhir (<code class="text-purple-300 font-mono">T</code>) dan <code class="text-purple-300 font-mono">S_max</code> mengklasifikasikan risiko ke 5 tingkat serta menentukan kode respon:
                </p>
                <div class="space-y-1.5 text-xs pt-1">
                  <div class="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
                    <span class="text-slate-300"><strong>Tingkat Kategori:</strong> Rendah &bull; Moderate &bull; Tinggi &bull; Sangat Tinggi &bull; Ekstrim</span>
                  </div>
                  <div class="grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div class="p-1.5 rounded bg-slate-900 border border-slate-800">
                      <span class="font-bold text-emerald-400 font-mono">IK</span>
                      <span class="text-slate-400 block text-[10px]">Instruksi Kerja</span>
                    </div>
                    <div class="p-1.5 rounded bg-slate-900 border border-slate-800">
                      <span class="font-bold text-blue-400 font-mono">P</span>
                      <span class="text-slate-400 block text-[10px]">Prosedur / SOP</span>
                    </div>
                    <div class="p-1.5 rounded bg-slate-900 border border-slate-800">
                      <span class="font-bold text-purple-400 font-mono">PK</span>
                      <span class="text-slate-400 block text-[10px]">Program Kerja K3</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Show>

        {/* Loading State: High-Tech Scanner Animation */}
        <Show when={isGenerating()}>
          <div class="bg-slate-900 rounded-2xl p-16 text-center border border-blue-500/30 shadow-2xl relative overflow-hidden">
            <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/30">
              <svg class="w-10 h-10 text-white animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-white mb-3 tracking-tight">
              Gemini AI Sedang Menganalisis Pekerjaan...
            </h3>
            <p class="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
              Mengidentifikasi potensi bahaya K3/L, mengevaluasi matriks risiko 5x5 PJB, dan menyusun pengendalian hierarki sesuai regulasi ketenagalistrikan.
            </p>

            <Show when={ikProgress()}>
              <div class="mt-6 max-w-md mx-auto">
                <div class="flex justify-between text-xs font-semibold text-slate-300 mb-2">
                  <span class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    Memproses Batch {ikProgress()!.current} dari {ikProgress()!.total}
                  </span>
                  <span class="font-mono text-blue-400">
                    {Math.round((ikProgress()!.current / ikProgress()!.total) * 100)}%
                  </span>
                </div>
                <div class="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700 p-0.5 shadow-inner">
                  <div 
                    class="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 h-2 rounded-full transition-all duration-500 shadow-md shadow-blue-500/30" 
                    style={{ width: `${Math.round((ikProgress()!.current / ikProgress()!.total) * 100)}%` }}
                  />
                </div>
              </div>
            </Show>

            <div class="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-slate-500 font-medium">
              <span class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
                Identifikasi Bahaya
              </span>
              <span class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                Kalkulasi Matriks 5x5
              </span>
              <span class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                Hierarki Kontrol ECM
              </span>
            </div>
          </div>
        </Show>
      </main>

      {/* Footer */}
      <footer class="mt-auto border-t border-slate-800 py-6 px-6 text-center text-sm text-slate-500 bg-slate-900/50">
        <div class="max-w-[1800px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            <span class="font-bold text-slate-400">AutoHIRA Enterprise v1.0.0</span>
          </p>
          <p class="text-slate-600 font-medium">
            Powered by Gemini 3.1 Flash-Lite • SolidStart • PostgreSQL & Drizzle ORM
          </p>
        </div>
      </footer>

      {/* Floating Toast Notification */}
      <Show when={toast()}>
        <div class="fixed bottom-6 right-6 z-50 animate-fade-in-up">
          <div class={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border font-medium text-sm
            ${toast()!.type === "success" 
              ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/30 backdrop-blur-md" 
              : "bg-rose-950/90 text-rose-300 border-rose-500/30 backdrop-blur-md"}`}>
            <Show
              when={toast()!.type === "success"}
              fallback={
                <svg class="w-5 h-5 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            >
              <svg class="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </Show>
            <span>{toast()!.message}</span>
          </div>
        </div>
      </Show>
    </div>
  );
}
