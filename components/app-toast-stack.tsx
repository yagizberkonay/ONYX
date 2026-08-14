import type { ReactNode } from "react";

export type ToastTone = "info" | "success" | "warning" | "error";

export type AppToast = {
  id: string;
  tone: ToastTone;
  message: string;
  detail?: string;
};

type AppToastStackProps = {
  toasts: AppToast[];
  onDismiss: (id: string) => void;
};

const toneLabel: Record<ToastTone, string> = {
  info: "Info",
  success: "Done",
  warning: "Notice",
  error: "Error",
};

const toneMark: Record<ToastTone, ReactNode> = {
  info: <span aria-hidden="true">i</span>,
  success: <span aria-hidden="true">✓</span>,
  warning: <span aria-hidden="true">!</span>,
  error: <span aria-hidden="true">×</span>,
};

export function AppToastStack({ toasts, onDismiss }: AppToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-5 right-5 z-[80] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((toast) => (
        <div className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border-strong bg-surface-raised/95 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.32)] backdrop-blur-md" key={toast.id} role={toast.tone === "error" ? "alert" : "status"}>
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border-strong font-mono text-[11px] font-semibold text-neutral-200">{toneMark[toast.tone]}</span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">{toneLabel[toast.tone]}</div>
            <div className="mt-1 text-[12px] leading-5 text-neutral-200">{toast.message}</div>
            {toast.detail ? <div className="mt-1 break-words font-mono text-[10px] leading-4 text-neutral-600">{toast.detail}</div> : null}
          </div>
          <button aria-label="Dismiss notification" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-neutral-600 transition-colors hover:bg-surface-hover hover:text-neutral-200" onClick={() => onDismiss(toast.id)} type="button">×</button>
        </div>
      ))}
    </div>
  );
}
