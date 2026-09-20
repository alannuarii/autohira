import { createSignal, onMount, For, Show, createMemo } from "solid-js";
import { confirmDialog } from "~/lib/alerts";

interface Activity {
  id: number;
  title: string;
  unit: string;
  location: string;
  supervisor: string;
  createdAt: string;
}

interface ActivityHistoryProps {
  onLoad: (activityId: number) => void;
  refreshTrigger: number;
}

export default function ActivityHistory(props: ActivityHistoryProps) {
  const [activities, setActivities] = createSignal<Activity[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal("");

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/activities");
      const data = await res.json();
      if (data.success) {
        setActivities(data.data);
      }
    } catch (e) {
      console.error("Failed to fetch activities:", e);
    } finally {
      setLoading(false);
    }
  };

  onMount(fetchActivities);

  // Re-fetch whenever parent updates refreshTrigger
  const checkRefresh = () => {
    if (props.refreshTrigger > 0) {
      fetchActivities();
    }
    return props.refreshTrigger;
  };

  const filteredActivities = createMemo(() => {
    const q = searchQuery().toLowerCase().trim();
    if (!q) return activities();
    return activities().filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.unit && a.unit.toLowerCase().includes(q)) ||
        (a.location && a.location.toLowerCase().includes(q))
    );
  });

  const handleDelete = async (e: MouseEvent, id: number, title: string) => {
    e.stopPropagation();
    const confirmed = await confirmDialog({
      title: "Hapus Dokumen Arsip?",
      text: `Apakah Anda yakin ingin menghapus dokumen "${title}" dari database? Data yang dihapus tidak dapat dipulihkan.`,
      confirmText: "Ya, Hapus Dokumen",
      cancelText: "Batal",
      isDestructive: true,
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/activities/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchActivities();
      }
    } catch (e) {
      console.error("Failed to delete activity:", e);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div class="bg-slate-900 rounded-2xl p-6 sm:p-8 flex flex-col h-full shadow-xl relative overflow-hidden border border-slate-800">
      {/* Hidden reactivity anchor */}
      <span class="hidden">{checkRefresh()}</span>

      {/* Decorative top accent line */}
      <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500" />

      {/* Header */}
      <div class="flex items-center justify-between gap-4 mb-5">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-sm">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-lg sm:text-xl font-bold text-white tracking-tight">
                Arsip Dokumen
              </h2>
              <span class="px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 text-xs font-bold border border-purple-500/20">
                {activities().length}
              </span>
            </div>
            <p class="text-sm text-slate-400 mt-1">Database HIRADC Tersimpan</p>
          </div>
        </div>

        {/* Refresh button */}
        <button
          type="button"
          onClick={fetchActivities}
          class="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors shadow-sm"
          title="Segarkan data"
        >
          <svg class={`w-5 h-5 ${loading() ? "animate-spin text-purple-400" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Search Bar */}
      <Show when={activities().length > 0}>
        <div class="mb-4 relative">
          <input
            type="text"
            class="w-full px-4 py-2.5 pl-10 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all shadow-inner"
            placeholder="Cari arsip..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
          />
          <svg class="w-4 h-4 text-slate-500 absolute left-3.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </Show>

      {/* Content Area */}
      <div class="flex-1 min-h-[220px] max-h-[400px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
        <Show when={loading() && activities().length === 0}>
          <div class="h-full flex flex-col items-center justify-center py-12 text-slate-400">
            <svg class="w-8 h-8 animate-spin text-purple-500 mb-3" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            </svg>
            <span class="text-sm font-medium">Memuat arsip dokumen...</span>
          </div>
        </Show>

        <Show when={!loading() && activities().length === 0}>
          <div class="h-full flex flex-col items-center justify-center py-10 text-center px-6 rounded-xl border-2 border-dashed border-slate-800 bg-slate-950/50">
            <div class="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 mb-3 shadow-inner">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={1.5}>
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p class="text-sm font-bold text-slate-300">Belum Ada Dokumen</p>
            <p class="text-xs text-slate-500 mt-1.5 max-w-[220px]">
              Dokumen hasil analisis yang Anda simpan akan muncul di sini.
            </p>
          </div>
        </Show>

        <Show when={filteredActivities().length > 0}>
          <For each={filteredActivities()}>
            {(act) => (
              <div
                class="group p-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/50 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-sm hover:shadow-md"
                onClick={() => props.onLoad(act.id)}
              >
                <div class="min-w-0 flex-1">
                  <h4 
                    class="text-sm font-bold text-white group-hover:text-purple-400 transition-colors truncate"
                    title={act.title}
                  >
                    {act.title}
                  </h4>

                  <div class="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-400">
                    <span class="truncate font-medium">{act.location || act.unit}</span>
                    <span class="text-slate-600">•</span>
                    <span class="text-slate-500 shrink-0">{formatDate(act.createdAt)}</span>
                  </div>
                </div>

                <div class="flex items-center gap-1 opacity-70 group-hover:opacity-100 shrink-0 transition-opacity">
                  <button
                    type="button"
                    class="p-2 rounded-lg hover:bg-purple-500/20 text-slate-400 hover:text-purple-400 transition-colors"
                    title="Buka Dokumen"
                    onClick={() => props.onLoad(act.id)}
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
                      <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="p-2 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Hapus Dokumen"
                    onClick={(e) => handleDelete(e, act.id, act.title)}
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>
    </div>
  );
}
