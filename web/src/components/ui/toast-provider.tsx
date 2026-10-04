// Holds the Toasts of the app and shows them bottom-right, at most three, newest last. Mounted once, around the router.
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Toast } from './toast';
import { ToastContext, type ToastOptions } from './use-toast';

const MAX_TOASTS = 3;

type ToastItem = ToastOptions & { id: number };

export type ToastProviderProps = { children: ReactNode };

export function ToastProvider({ children }: ToastProviderProps) {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const show = useCallback((toast: ToastOptions) => {
    nextId.current += 1;
    const item = { ...toast, id: nextId.current };
    setToasts((current) => [...current, item].slice(-MAX_TOASTS));
  }, []);
  const dismiss = (id: number) => setToasts((current) => current.filter((toast) => toast.id !== id));
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="region"
        aria-label={t('toast.region')}
        className="pointer-events-none fixed right-4 bottom-4 z-60 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2"
      >
        {toasts.map(({ id, ...toast }) => (
          <Toast key={id} {...toast} closeLabel={t('toast.close')} onClose={() => dismiss(id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
