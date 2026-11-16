"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type Tone = "neutral" | "error";
interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

/** One quiet confirmation at a time, bottom centre; it floats, so it may carry a shadow. */
export function Toaster({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, tone: Tone = "neutral") => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message, tone });
    timer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
      >
        {toast && (
          <p
            key={toast.id}
            className={`pointer-events-auto max-w-md rounded-md px-4 py-2.5 text-sm shadow-[0_6px_20px_rgba(0,0,0,0.18)] motion-safe:animate-[toast-in_160ms_ease-out] ${
              toast.tone === "error" ? "bg-neg-bg text-neg-ink" : "bg-primary text-white"
            }`}
          >
            {toast.message}
          </p>
        )}
      </div>
    </ToastContext.Provider>
  );
}
