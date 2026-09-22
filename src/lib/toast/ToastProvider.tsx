import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  title?: string;
  description?: string;
  message?: string;
  type?: ToastType;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

export type ToastFunction = {
  (arg1: ToastType | string | ToastOptions, arg2?: string | ToastType): void;
  addToast: (arg1: ToastType | string | ToastOptions, arg2?: string | ToastType) => void;
  showToast: (arg1: ToastType | string | ToastOptions, arg2?: string | ToastType) => void;
  show: (arg1: ToastType | string | ToastOptions, arg2?: string | ToastType) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
};

const ToastContext = createContext<ToastFunction | null>(null);

const KNOWN_TYPES: ToastType[] = ['success', 'error', 'info', 'warning'];

export function useToast(): ToastFunction {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful fallback dummy if ever used outside provider
    const fallback: any = (arg1: any, arg2?: any) => {
      console.log('[Toast fallback]:', arg1, arg2);
    };
    fallback.addToast = fallback;
    fallback.showToast = fallback;
    fallback.show = fallback;
    fallback.success = (msg: string) => console.log('[Toast success]:', msg);
    fallback.error = (msg: string) => console.error('[Toast error]:', msg);
    fallback.info = (msg: string) => console.log('[Toast info]:', msg);
    fallback.warning = (msg: string) => console.warn('[Toast warning]:', msg);
    return fallback;
  }
  return ctx;
}

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors = {
  success: 'border-emerald-500/40 bg-emerald-950/80 text-emerald-200 shadow-emerald-950/50',
  error: 'border-rose-500/40 bg-rose-950/80 text-rose-200 shadow-rose-950/50',
  info: 'border-cyan-500/40 bg-cyan-950/80 text-cyan-200 shadow-cyan-950/50',
  warning: 'border-amber-500/40 bg-amber-950/80 text-amber-200 shadow-amber-950/50',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToastRaw = useCallback((arg1: ToastType | string | ToastOptions, arg2?: string | ToastType) => {
    let type: ToastType = 'info';
    let title: string | undefined = undefined;
    let message = '';

    if (typeof arg1 === 'object' && arg1 !== null) {
      // Called with { title, description, message, type }
      type = arg1.type || 'info';
      title = arg1.title;
      message = arg1.description || arg1.message || arg1.title || '';
    } else if (typeof arg1 === 'string') {
      const isArg1Type = KNOWN_TYPES.includes(arg1 as ToastType);
      const isArg2Type = typeof arg2 === 'string' && KNOWN_TYPES.includes(arg2 as ToastType);

      if (isArg1Type && typeof arg2 === 'string') {
        // Called as showToast('success', 'User saved')
        type = arg1 as ToastType;
        message = arg2;
      } else if (isArg2Type) {
        // Called as addToast('User saved', 'success')
        type = arg2 as ToastType;
        message = arg1;
      } else {
        // Called as showToast('Simple message string')
        message = arg1;
        type = 'info';
      }
    }

    const id = crypto.randomUUID ? crypto.randomUUID() : `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastItem = { id, type, title, message };

    setToasts((prev) => [...prev.slice(-4), newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toastContextValue = useMemo<ToastFunction>(() => {
    const fn: any = (arg1: any, arg2?: any) => addToastRaw(arg1, arg2);
    fn.addToast = (arg1: any, arg2?: any) => addToastRaw(arg1, arg2);
    fn.showToast = (arg1: any, arg2?: any) => addToastRaw(arg1, arg2);
    fn.show = (arg1: any, arg2?: any) => addToastRaw(arg1, arg2);
    fn.success = (msg: string, t?: string) => addToastRaw({ type: 'success', message: msg, title: t });
    fn.error = (msg: string, t?: string) => addToastRaw({ type: 'error', message: msg, title: t });
    fn.info = (msg: string, t?: string) => addToastRaw({ type: 'info', message: msg, title: t });
    fn.warning = (msg: string, t?: string) => addToastRaw({ type: 'warning', message: msg, title: t });
    return fn as ToastFunction;
  }, [addToastRaw]);

  return (
    <ToastContext.Provider value={toastContextValue}>
      {children}
      <div
        id="toast-portal-root"
        className="fixed bottom-6 right-6 z-[9999] space-y-2.5 w-84 max-w-[calc(100vw-2rem)] pointer-events-none"
      >
        {toasts.map((t) => {
          const Icon = icons[t.type] || Info;
          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 p-3.5 rounded-xl border backdrop-blur-md shadow-lg pointer-events-auto transition-all duration-200 animate-in fade-in slide-in-from-bottom-3 ${colors[t.type]}`}
            >
              <Icon className="w-4 h-4 mt-0.5 shrink-0 opacity-90" />
              <div className="flex-1 min-w-0 pr-1">
                {t.title && (
                  <div className="text-xs font-semibold leading-tight tracking-wide mb-0.5 opacity-95">
                    {t.title}
                  </div>
                )}
                <div className="text-xs leading-relaxed opacity-90 break-words">
                  {t.message}
                </div>
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="cursor-pointer p-0.5 rounded-md hover:bg-white/10 text-current opacity-70 hover:opacity-100 transition-opacity shrink-0"
                aria-label="Dismiss toast"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

