import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

let toastCount = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    ({
      title,
      description,
      variant = 'default',
    }: {
      title?: string;
      description?: string;
      variant?: 'default' | 'destructive';
    }) => {
      const id = String(toastCount++);
      const newToast: Toast = { id, title, description, variant };

      setToasts((prev) => [...prev, newToast]);

      // 3초 후 자동 제거
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);

      return {
        id,
        dismiss: () =>
          setToasts((prev) => prev.filter((t) => t.id !== id)),
      };
    },
    []
  );

  return { toast, toasts };
}
