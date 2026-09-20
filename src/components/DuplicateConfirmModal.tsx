import { Show } from "solid-js";

export interface ExistingActivityData {
  id: number;
  title: string;
  docNumber?: string | null;
  unit: string;
  location: string;
  supervisor: string;
  createdAt: string;
  updatedAt?: string;
  itemCount: number;
}

interface DuplicateConfirmModalProps {
  isOpen: boolean;
  activity: ExistingActivityData | null;
  onUseExisting: (id: number) => void;
  onRegenerate: () => void;
  onCancel: () => void;
}

export default function DuplicateConfirmModal(props: DuplicateConfirmModalProps) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Show when={props.isOpen && props.activity}>
      <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
        <div class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative">
          {/* Top Banner Accent */}
          <div class="h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500" />

          <div class="p-6 space-y-5">
            {/* Header Icon & Title */}
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <h3 class="text-lg font-bold text-white tracking-tight">Dokumen Serupa Ditemukan</h3>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Tersimpan di DB
                  </span>
                </div>
                <p class="text-xs text-slate-400 mt-1">
                  Aktivitas atau dokumen IK ini sebelumnya sudah pernah digenerate dan tersimpan di database.
                </p>
              </div>
            </div>

            {/* Existing Info Box */}
            <div class="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-2 text-sm">
              <div>
                <span class="text-slate-500 text-xs block">Judul Aktivitas:</span>
                <span class="text-slate-200 font-semibold leading-tight line-clamp-2">
                  {props.activity!.title}
                </span>
              </div>

              <Show when={props.activity!.docNumber}>
                <div>
                  <span class="text-slate-500 text-xs block">Nomor Dokumen IK:</span>
                  <span class="text-cyan-400 font-mono text-xs font-semibold">
                    {props.activity!.docNumber}
                  </span>
                </div>
              </Show>

              <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80 text-xs">
                <div>
                  <span class="text-slate-500 block">Tersimpan:</span>
                  <span class="text-slate-300">{formatDate(props.activity!.createdAt)}</span>
                </div>
                <div>
                  <span class="text-slate-500 block">Jumlah Temuan Bahaya:</span>
                  <span class="text-emerald-400 font-semibold">{props.activity!.itemCount} Sub-Aktivitas</span>
                </div>
              </div>
            </div>

            {/* Explanation Note */}
            <div class="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-blue-300 leading-relaxed">
              💡 <strong>Rekomendasi:</strong> Gunakan data database jika dokumen ini tidak mengalami perubahan. Pilih <strong>Generate Ulang</strong> jika langkah aktivitas (Poin E) pada dokumen IK ini telah direvisi atau diperbarui.
            </div>

            {/* Actions */}
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={props.onCancel}
                class="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors border border-slate-700 order-3 sm:order-1"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={props.onRegenerate}
                class="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-md shadow-blue-600/20 order-2"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Generate Ulang (AI)</span>
              </button>

              <button
                type="button"
                onClick={() => props.onUseExisting(props.activity!.id)}
                class="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all shadow-md shadow-emerald-600/20 order-1 sm:order-3"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Gunakan Data Database</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
}
