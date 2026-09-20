import Swal from "sweetalert2";

// Kustomisasi tema Dark Slate yang selaras dengan UI AutoHIRA
export const customSwal = Swal.mixin({
  background: "#0f172a", // slate-900
  color: "#f8fafc",      // slate-50
  customClass: {
    popup: "border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl",
    title: "text-lg font-bold text-white tracking-tight",
    htmlContainer: "text-sm text-slate-300 leading-relaxed",
    confirmButton: "px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md focus:outline-none focus:ring-2",
    cancelButton: "px-5 py-2.5 rounded-xl font-semibold text-sm transition-all focus:outline-none focus:ring-2",
  },
  buttonsStyling: true,
});

/**
 * Konfirmasi modern pengganti window.confirm
 */
export async function confirmDialog(options: {
  title: string;
  text: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}): Promise<boolean> {
  const result = await customSwal.fire({
    title: options.title,
    text: options.text,
    icon: options.isDestructive ? "warning" : "question",
    showCancelButton: true,
    confirmButtonColor: options.isDestructive ? "#e11d48" : "#2563eb", // rose-600 vs blue-600
    cancelButtonColor: "#334155", // slate-700
    confirmButtonText: options.confirmText || "Ya, Lanjutkan",
    cancelButtonText: options.cancelText || "Batal",
    reverseButtons: true,
  });

  return result.isConfirmed;
}

/**
 * Notifikasi popup alert modern pengganti window.alert
 */
export async function alertDialog(options: {
  title: string;
  text: string;
  icon?: "info" | "warning" | "error" | "success";
  buttonText?: string;
}) {
  await customSwal.fire({
    title: options.title,
    text: options.text,
    icon: options.icon || "info",
    confirmButtonColor: "#2563eb",
    confirmButtonText: options.buttonText || "Mengerti",
  });
}
