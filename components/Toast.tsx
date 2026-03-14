'use client';

export interface ToastItem { id: number; message: string }

interface Props { toasts: ToastItem[] }

export default function Toast({ toasts }: Props) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-white shadow-lg border border-[#F0F0F0] px-4 py-3 rounded-xl text-sm font-semibold text-[#2C2C2C] animate-fade-in"
          style={{ animation: 'fadeInUp 0.2s ease' }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

// Convenience hook — keeps toast list state + auto-dismiss
import { useState, useCallback } from 'react';

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2500);
  }, []);

  return { toasts, addToast };
}
