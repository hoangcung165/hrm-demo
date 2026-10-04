import { createContext, useContext } from 'react';
import type { ToastProps } from './toast';

export type ToastOptions = Pick<ToastProps, 'variant' | 'message' | 'detail' | 'action'>;

export const ToastContext = createContext<((toast: ToastOptions) => void) | null>(null);

/** Shows a Toast: `toast({ variant: 'success', message: 'Đã lưu thông tin công ty' })`. */
export function useToast(): (toast: ToastOptions) => void {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast must be used inside <ToastProvider>');
  return show;
}
