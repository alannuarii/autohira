import { createSignal, onMount } from "solid-js";

export default function TopBar() {
  const [dbStatus, setDbStatus] = createSignal<"checking" | "online" | "offline">("checking");

  onMount(async () => {
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        setDbStatus("online");
      } else {
        setDbStatus("offline");
      }
    } catch {
      setDbStatus("offline");
    }
  });

  return (
    <header class="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 px-6 py-4 shadow-sm">
      <div class="max-w-[1800px] mx-auto flex items-center justify-between">
        {/* Brand & Identity */}
        <div class="flex items-center gap-4">
          <div class="relative flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20 border border-blue-500">
            {/* SVG Safety / Lightning Shield Icon */}
            <svg class="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path fill-rule="evenodd" d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.5 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08zm.39 5.08a.75.75 0 00-1.312-.6l-3.5 5.25A.75.75 0 008.71 13h2.535l-.894 4.025a.75.75 0 001.355.57l3.75-6A.75.75 0 0014.82 10.5H12.23l.676-3.25z" clip-rule="evenodd" />
            </svg>
            <div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-950" />
          </div>
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-2xl font-bold tracking-tight text-white font-sans">
                AutoHIRA
              </h1>
              <span class="px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                AI Engine
              </span>
            </div>
            <p class="text-sm text-slate-400 font-medium mt-0.5">
              PLN Nusantara Power • Automated HIRADC Platform
            </p>
          </div>
        </div>

        {/* Live System Diagnostics & Compliance */}
        <div class="flex items-center gap-4">
          {/* AI Badge */}
          <div class="hidden sm:flex items-center gap-2.5 px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm font-medium shadow-sm">
            <span class="relative flex h-2.5 w-2.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
            <span class="text-slate-400">Model:</span>
            <span class="text-cyan-400 font-semibold font-mono">Gemini 3.1 Flash-Lite</span>
          </div>

          {/* Database Health Pill */}
          <div class="flex items-center gap-2.5 px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm font-medium shadow-sm">
            <span
              class={`relative flex h-2.5 w-2.5 rounded-full ${
                dbStatus() === "online"
                  ? "bg-emerald-500"
                  : dbStatus() === "offline"
                  ? "bg-rose-500"
                  : "bg-amber-500"
              }`}
            />
            <span class="text-slate-400">DB:</span>
            <span
              class={
                dbStatus() === "online"
                  ? "text-emerald-400 font-semibold"
                  : dbStatus() === "offline"
                  ? "text-rose-400 font-semibold"
                  : "text-amber-400 font-semibold"
              }
            >
              {dbStatus() === "checking"
                ? "Connecting..."
                : dbStatus() === "online"
                ? "PostgreSQL Active"
                : "Offline"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
