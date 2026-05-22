"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type FeedbackTone = "success" | "error" | "info" | "loading";

interface Toast {
  readonly id: string;
  readonly message: string;
  readonly tone: FeedbackTone;
}

interface FeedbackApi {
  success: (message: string) => string;
  error: (message: string) => string;
  info: (message: string) => string;
  loading: (message: string) => string;
  dismiss: (id: string) => void;
}

const TOAST_LIMIT = 4;
const SUCCESS_MS = 2000;
const INFO_MS = 2500;
const ERROR_MS = 4000;
const FeedbackContext = createContext<FeedbackApi | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const show = useCallback(
    (tone: FeedbackTone, message: string) => {
      const id = crypto.randomUUID();
      setToasts((items) => [{ id, tone, message }, ...items].slice(0, TOAST_LIMIT));
      const delay = getDelay(tone);
      if (delay) window.setTimeout(() => dismiss(id), delay);
      return id;
    },
    [dismiss],
  );

  const api = useMemo<FeedbackApi>(
    () => ({
      dismiss,
      error: (message) => show("error", message),
      info: (message) => show("info", message),
      loading: (message) => show("loading", message),
      success: (message) => show("success", message),
    }),
    [dismiss, show],
  );

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const api = useContext(FeedbackContext);
  if (!api) throw new Error("useFeedback must be used inside FeedbackProvider.");
  return api;
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: readonly Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-4 z-[100] flex flex-col items-center gap-2 md:left-auto md:right-4 md:items-end">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => onDismiss(toast.id)}
          className={`motion-toast pointer-events-auto w-full max-w-sm rounded-lg border px-3 py-2 text-left text-sm shadow-lg ${toneClass(toast.tone)}`}
          role="status"
        >
          <span className="flex items-center gap-2">
            {toast.tone === "loading" ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : null}
            <span className="min-w-0 flex-1 break-words">{toast.message}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function getDelay(tone: FeedbackTone) {
  if (tone === "success") return SUCCESS_MS;
  if (tone === "info") return INFO_MS;
  if (tone === "error") return ERROR_MS;
  return null;
}

function toneClass(tone: FeedbackTone) {
  if (tone === "success") return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
  if (tone === "error") return "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200";
  if (tone === "loading") return "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200";
  return "border-zinc-200 bg-white text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
}
