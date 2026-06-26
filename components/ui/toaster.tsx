'use client';

import { useToast } from '@/hooks/use-toast';
import { Toast } from '@/hooks/use-toast';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastComponent({ toast }: { toast: Toast }) {
  return (
    <div
      className={`mb-2 rounded-lg border px-4 py-3 text-sm shadow-md transition-all ${
        toast.variant === 'destructive'
          ? 'border-destructive/50 bg-destructive text-destructive-foreground'
          : 'border-border bg-background'
      }`}
    >
      {toast.title && <p className="font-semibold">{toast.title}</p>}
      {toast.description && (
        <p className="mt-1 text-xs opacity-90">{toast.description}</p>
      )}
    </div>
  );
}
