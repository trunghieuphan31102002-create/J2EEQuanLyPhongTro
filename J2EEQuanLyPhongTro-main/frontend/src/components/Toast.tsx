import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  show: (message: string, kind?: ToastKind) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, kind }]);
  }, []);

  const success = useCallback((m: string) => show(m, 'success'), [show]);
  const error   = useCallback((m: string) => show(m, 'error'),   [show]);

  const value = useMemo(() => ({ show, success, error }), [show, success, error]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-2 max-w-sm">
        {items.map((t) => (
          <ToastCard key={t.id} item={t} onDone={() => setItems((prev) => prev.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onDone }: { item: ToastItem; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  const borderColor =
    item.kind === 'success' ? 'border-emerald-500'
    : item.kind === 'error' ? 'border-red-500'
    : 'border-accent-500';

  return (
    <div
      className={`bg-white rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] px-4 py-3.5 flex items-center gap-3 border-l-4 ${borderColor} animate-[slideIn_0.3s_ease]`}
    >
      <span className="text-sm text-ink-700">{item.message}</span>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
