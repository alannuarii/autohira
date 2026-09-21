import { createSignal, For, Show, onCleanup } from "solid-js";
import { parseIkMarkdown, getStepStats, type ParsedIkDocument } from "~/lib/ik-parser";
import DuplicateConfirmModal, { type ExistingActivityData } from "./DuplicateConfirmModal";
import { alertDialog } from "~/lib/alerts";

interface GeneratorFormProps {
  onGenerate: (data: {
    activity: string;
    unit: string;
    location: string;
    supervisor: string;
  }) => void;
  onGenerateIkStart: () => void;
  onGenerateIkProgress: (current: number, total: number) => void;
  onGenerateIkComplete: (data: any) => void;
  onGenerateIkError: (error: string) => void;
  onRequestUseExisting?: (activityId: number) => void;
  isLoading: boolean;
  ikProgress: { current: number; total: number } | null;
}

const PRESETS = [
  {
    label: "⚡ Pemeliharaan Trafo 20kV",
    activity: "Pemeliharaan rutin dan pengujian isolasi Trafo Distribusi 20kV Unit 1",
    location: "Switchyard 20kV",
  },
  {
    label: "🔥 Pekerjaan Panas (Welding) Pipa Boiler",
    activity: "Pengelasan perbaikan kebocoran pipa high pressure steam boiler lantai 3",
    location: "Boiler Area Level 3",
  },
  {
    label: "🦺 Confined Space Tangki Solar",
    activity: "Pembersihan kerak dan inspeksi internal confined space Tangki Bahan Bakar HSD",
    location: "Tank Farm Area",
  },
  {
    label: "💧 Overhaul Cooling Water Pump",
    activity: "Pembongkaran dan penggantian mechanical seal pompa pendingin utama (CWP-A)",
    location: "Pump House Water Intake",
  },
  {
    label: "🚨 Uji Berkala Fire Protection System",
    activity: "Pemeriksaan dan pengetesan pompa hydrant diesel serta deluge valve sistem pemadam",
    location: "FPS Fire House",
  },
];

export default function GeneratorForm(props: GeneratorFormProps) {
  const [activeTab, setActiveTab] = createSignal<"manual" | "ik">("manual");
  
  // State for Manual Mode
  const [activity, setActivity] = createSignal("");
  const [unit, setUnit] = createSignal("UP Minahasa / ULPLTD Lopana");
  const [location, setLocation] = createSignal("Power House");
  const [supervisor, setSupervisor] = createSignal("Team Leader Pemeliharaan");
  const [showAdvanced, setShowAdvanced] = createSignal(true);

  // State for IK Mode
  const [ikMarkdown, setIkMarkdown] = createSignal("");
  const [ikPreview, setIkPreview] = createSignal<ParsedIkDocument | null>(null);
  const [ikStats, setIkStats] = createSignal<{e1: number, e2: number, e3: number, total: number} | null>(null);
  const [isDragging, setIsDragging] = createSignal(false);

  // State for Duplicate Confirmation Modal
  const [duplicateModalOpen, setDuplicateModalOpen] = createSignal(false);
  const [existingActivity, setExistingActivity] = createSignal<ExistingActivityData | null>(null);
  const [pendingAction, setPendingAction] = createSignal<"manual" | "ik" | null>(null);

  // Eksekusi generator Manual
  const executeManualGeneration = () => {
    props.onGenerate({
      activity: activity(),
      unit: unit(),
      location: location(),
      supervisor: supervisor(),
    });
  };

  const handleSubmitManual = async (e: Event) => {
    e.preventDefault();
    const title = activity().trim();
    if (!title) return;

    try {
      const checkRes = await fetch(`/api/activities/check?title=${encodeURIComponent(title)}`);
      const checkData = await checkRes.json();
      if (checkData.exists && checkData.activity) {
        setExistingActivity(checkData.activity);
        setPendingAction("manual");
        setDuplicateModalOpen(true);
        return;
      }
    } catch (err) {
      console.warn("Check duplicate error:", err);
    }

    executeManualGeneration();
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setActivity(preset.activity);
    setLocation(preset.location);
  };

  const updateIkPreview = (text: string) => {
    setIkMarkdown(text);
    if (text.trim().length > 20) {
      try {
        const metadata = parseIkMarkdown(text);
        setIkPreview(metadata);
        setIkStats(getStepStats(metadata.steps));
      } catch (err) {
        setIkPreview(null);
        setIkStats(null);
      }
    } else {
      setIkPreview(null);
      setIkStats(null);
    }
  };

  const handleIkMarkdownChange = (e: Event) => {
    const text = (e.target as HTMLTextAreaElement).value;
    updateIkPreview(text);
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".md") || file.type === "text/markdown") {
        const text = await file.text();
        updateIkPreview(text);
      } else {
        alertDialog({
          title: "Format File Tidak Sesuai",
          text: "Mohon unggah file berekstensi .md (Markdown) instruksi kerja.",
          icon: "warning",
          buttonText: "OK",
        });
      }
    }
  };

  const handleFileUpload = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const text = await file.text();
      updateIkPreview(text);
    }
  };

  // Eksekusi generator dari IK Markdown
  const executeIkGeneration = async () => {
    props.onGenerateIkStart();

    try {
      const response = await fetch("/api/generate-from-ik", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream"
        },
        body: JSON.stringify({ markdownContent: ikMarkdown() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal memulai proses generate");
      }

      if (!response.body) throw new Error("ReadableStream not supported");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let isCompleted = false;

      const processEventBlock = (block: string) => {
        const lines = block.split(/\r?\n/);
        let eventType = "message";
        const dataLines: string[] = [];

        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventType = line.substring(6).trim();
          } else if (line.startsWith("data:")) {
            dataLines.push(line.substring(5).trim());
          }
        }

        const dataStr = dataLines.join("\n");
        if (!dataStr) return;

        try {
          const data = JSON.parse(dataStr);
          if (eventType === "progress") {
            props.onGenerateIkProgress(data.batchIndex, data.totalBatches);
          } else if (eventType === "complete") {
            isCompleted = true;
            props.onGenerateIkComplete(data);
          } else if (eventType === "error") {
            isCompleted = true;
            props.onGenerateIkError(data.message || "Gagal memproses analisis IK");
          }
        } catch (err) {
          console.error("Error parsing SSE data:", err, dataStr);
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          if (buffer.trim()) {
            processEventBlock(buffer);
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // SSE memisahkan blok event dengan double-newline
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() || ""; // Sisa block yang belum lengkap

        for (const block of blocks) {
          if (block.trim()) {
            processEventBlock(block);
          }
        }
      }

      if (!isCompleted) {
        props.onGenerateIkError("Koneksi terputus sebelum proses analisis IK selesai.");
      }
    } catch (error) {
      props.onGenerateIkError(error instanceof Error ? error.message : "Terjadi kesalahan koneksi SSE");
    }
  };

  const handleSubmitIk = async (e: Event) => {
    e.preventDefault();
    if (!ikMarkdown().trim()) return;

    // Cek apakah aktivitas dari IK ini sudah ada di database
    let titleToCheck = "";
    if (ikPreview()?.title) {
      titleToCheck = ikPreview()!.title;
    } else {
      try {
        const meta = parseIkMarkdown(ikMarkdown());
        titleToCheck = meta.title;
      } catch {
        // ignore
      }
    }

    if (titleToCheck) {
      try {
        const checkRes = await fetch(`/api/activities/check?title=${encodeURIComponent(titleToCheck)}`);
        const checkData = await checkRes.json();
        if (checkData.exists && checkData.activity) {
          setExistingActivity(checkData.activity);
          setPendingAction("ik");
          setDuplicateModalOpen(true);
          return;
        }
      } catch (err) {
        console.warn("Check duplicate IK error:", err);
      }
    }

    executeIkGeneration();
  };

  // Handler konfirmasi modal
  const handleUseExisting = (activityId: number) => {
    setDuplicateModalOpen(false);
    if (props.onRequestUseExisting) {
      props.onRequestUseExisting(activityId);
    }
  };

  const handleRegenerate = () => {
    setDuplicateModalOpen(false);
    const action = pendingAction();
    if (action === "manual") {
      executeManualGeneration();
    } else if (action === "ik") {
      executeIkGeneration();
    }
  };

  const handleCancelModal = () => {
    setDuplicateModalOpen(false);
    setPendingAction(null);
  };

  return (
    <div class="bg-slate-900 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-xl border border-slate-800">
      {/* Decorative top accent line */}
      <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400" />

      {/* Header section */}
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-sm">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h2 class="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Generator HIRADC Cerdas
            </h2>
            <p class="text-sm text-slate-400 mt-1">
              Analisis otomatis bahaya, evaluasi risiko FMKP 2023, dan rekomendasi hierarki pengendalian
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div class="flex items-center gap-2 mb-6 border-b border-slate-800 pb-px">
        <button
          type="button"
          onClick={() => setActiveTab("manual")}
          class={`px-5 py-2.5 text-sm font-bold border-b-2 transition-colors ${
            activeTab() === "manual" 
            ? "border-blue-500 text-blue-400" 
            : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Input Cepat (Manual)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("ik")}
          class={`px-5 py-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab() === "ik" 
            ? "border-purple-500 text-purple-400" 
            : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload Dokumen IK
        </button>
      </div>

      <Show when={activeTab() === "manual"}>
        {/* Preset Chips */}
        <div class="mb-5">
          <span class="text-xs font-bold tracking-widest text-slate-500 uppercase mr-3">Contoh Cepat:</span>
          <div class="flex flex-wrap gap-2 mt-3">
            <For each={PRESETS}>
              {(p) => (
                <button
                  type="button"
                  class="px-3.5 py-1.5 rounded-full bg-slate-800/50 hover:bg-slate-700/80 border border-slate-700 text-[11px] font-medium text-slate-300 transition-colors whitespace-nowrap"
                  onClick={() => applyPreset(p)}
                  title={p.activity}
                >
                  {p.label}
                </button>
              )}
            </For>
          </div>
        </div>

        <form onSubmit={handleSubmitManual} class="space-y-5">
          {/* Main Textarea */}
          <div>
            <div class="flex justify-between items-center mb-2">
               <label class="block text-sm font-bold text-slate-300">
                 Deskripsi Aktivitas Pekerjaan Pembangkit <span class="text-rose-500">*</span>
               </label>
               {/* Advanced Toggle */}
               <button
                 type="button"
                 onClick={() => setShowAdvanced(!showAdvanced())}
                 class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 transition-colors"
               >
                 <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
                   <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                   <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                 </svg>
                 <span>{showAdvanced() ? "Sembunyikan Metadata" : "Parameter Unit"}</span>
               </button>
            </div>
            
            <div class="relative">
              <textarea
                class="w-full min-h-[100px] p-4 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-y leading-relaxed font-sans shadow-inner"
                placeholder="Contoh: Pemeliharaan Transformator 20kV pada Switchyard, meliputi pengujian megger, perbaikan isolasi busbar, dan pemeriksaan bushing..."
                value={activity()}
                onInput={(e) => setActivity(e.currentTarget.value)}
                required
                rows={3}
              />
              {activity().length > 0 && (
                <button
                  type="button"
                  onClick={() => setActivity("")}
                  class="absolute top-3 right-3 text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 transition-colors"
                >
                  Hapus
                </button>
              )}
            </div>
          </div>

          {/* Metadata Card (Unit, Lokasi, Supervisor) */}
          {showAdvanced() && (
            <div class="p-5 rounded-xl bg-slate-950/50 border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label class="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  <svg class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Unit / Fasilitas
                </label>
                <input
                  type="text"
                  class="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  value={unit()}
                  onInput={(e) => setUnit(e.currentTarget.value)}
                  placeholder="UP Minahasa / ULPLTD Lopana"
                />
              </div>
              <div>
                <label class="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  <svg class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Lokasi Spesifik
                </label>
                <input
                  type="text"
                  class="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  value={location()}
                  onInput={(e) => setLocation(e.currentTarget.value)}
                  placeholder="Power House / Switchyard"
                />
              </div>
              <div>
                <label class="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  <svg class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Pengawas Pekerjaan
                </label>
                <input
                  type="text"
                  class="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  value={supervisor()}
                  onInput={(e) => setSupervisor(e.currentTarget.value)}
                  placeholder="Team Leader Pemeliharaan"
                />
              </div>
            </div>
          )}

          {/* Generate Button */}
          <button
            type="submit"
            class="w-full py-4 rounded-xl font-bold text-white text-base bg-blue-600 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={props.isLoading || !activity().trim()}
          >
            {props.isLoading ? (
              <>
                <svg class="w-6 h-6 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
                </svg>
                <span>Sedang Menganalisis Bahaya & Menghitung Risiko dengan AI...</span>
              </>
            ) : (
              <>
                <svg class="w-6 h-6 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2.2}>
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Generate Analisis HIRADC (Manual AI)</span>
              </>
            )}
          </button>
        </form>
      </Show>

      <Show when={activeTab() === "ik"}>
        <div class="space-y-5 animate-fade-in">
          
           {/* Drag & Drop Area */}
           <div 
             class={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
               isDragging() ? "border-purple-400 bg-purple-500/10" : "border-slate-700 bg-slate-900 hover:border-slate-500 hover:bg-slate-800/50"
             }`}
             onDragOver={handleDragOver}
             onDragLeave={handleDragLeave}
             onDrop={handleDrop}
           >
             <input 
                type="file" 
                accept=".md" 
                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                onChange={handleFileUpload}
                disabled={props.isLoading}
             />
             <svg class="w-10 h-10 mx-auto text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={1.5}>
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
             </svg>
             <h3 class="text-sm font-bold text-slate-200 mb-1">Upload atau Drag & Drop file .md IK</h3>
             <p class="text-xs text-slate-500">Mendukung dokumen Markdown (.md) yang dikonversi dari IK PDF.</p>
           </div>

           <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-bold text-slate-300">
                Atau Paste Konten Markdown IK PLN NP
              </label>
              <Show when={ikMarkdown()}>
                <button type="button" onClick={() => updateIkPreview("")} class="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded">Bersihkan</button>
              </Show>
            </div>
            <div class="relative">
              <textarea
                class="w-full min-h-[140px] p-4 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-y font-mono shadow-inner custom-scrollbar"
                placeholder="# INSTRUKSI KERJA (IK)...&#10;Paste dokumen IK Markdown di sini..."
                value={ikMarkdown()}
                onInput={handleIkMarkdownChange}
                disabled={props.isLoading}
              />
            </div>
          </div>

          {/* IK Live Preview */}
          <Show when={ikPreview() && ikStats()}>
             <div class="p-4 rounded-xl bg-purple-900/10 border border-purple-500/30 flex items-start gap-4">
                <div class="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                   <svg class="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                   </svg>
                </div>
                <div class="flex-1">
                   <h4 class="text-sm font-bold text-slate-200">Pratinjau Ekstraksi Dokumen IK</h4>
                   <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-3 text-xs">
                      <div>
                         <span class="text-slate-500">Judul IK:</span>
                         <span class="text-slate-300 ml-2 font-semibold line-clamp-1" title={ikPreview()!.title}>{ikPreview()!.title}</span>
                      </div>
                      <div>
                         <span class="text-slate-500">Unit/Lokasi:</span>
                         <span class="text-slate-300 ml-2 font-medium">{ikPreview()!.unit}</span>
                      </div>
                   </div>
                   <div class="mt-4 inline-flex items-center gap-3 px-3.5 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 w-full sm:w-auto">
                      <span class="text-xs font-bold text-purple-300">
                         {ikStats()!.total} Butir Langkah Terdeteksi
                      </span>
                      <div class="h-4 w-px bg-purple-500/30"></div>
                      <span class="text-[11px] text-purple-400/80 font-medium">
                         (E.1: {ikStats()!.e1}, E.2: {ikStats()!.e2}, E.3: {ikStats()!.e3})
                      </span>
                   </div>
                </div>
             </div>
          </Show>

          {/* Generate Button IK */}
          <div class="relative">
            <button
              type="button"
              onClick={handleSubmitIk}
              class="w-full py-4 rounded-xl font-bold text-white text-base bg-purple-600 hover:bg-purple-500 transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
              disabled={props.isLoading || !ikMarkdown().trim() || (ikStats()?.total === 0)}
            >
              <Show when={props.isLoading && props.ikProgress}>
                {/* Progress bar background indicator */}
                <div 
                  class="absolute left-0 top-0 bottom-0 bg-purple-500/40 transition-all duration-300 ease-out z-0" 
                  style={{ width: `${(props.ikProgress!.current / props.ikProgress!.total) * 100}%` }}
                />
              </Show>

              <div class="relative z-10 flex items-center justify-center gap-3">
                {props.isLoading ? (
                  <>
                    <svg class="w-6 h-6 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
                    </svg>
                    <span>
                      {props.ikProgress 
                        ? `Memproses batch ${props.ikProgress.current} dari ${props.ikProgress.total}...` 
                        : "Memulai pemrosesan Batch AI..."}
                    </span>
                  </>
                ) : (
                  <>
                    <svg class="w-6 h-6 text-purple-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
                       <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span>Proses & Generate HIRADC</span>
                  </>
                )}
              </div>
            </button>
          </div>
        </div>
      </Show>

      {/* Duplicate Activity Confirmation Modal */}
      <DuplicateConfirmModal
        isOpen={duplicateModalOpen()}
        activity={existingActivity()}
        onUseExisting={handleUseExisting}
        onRegenerate={handleRegenerate}
        onCancel={handleCancelModal}
      />
    </div>
  );
}
