'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-2xl shadow-sm max-w-sm">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="text-xl font-black text-gray-800 mb-2">Something went wrong</h2>
        <p className="text-gray-400 text-sm mb-6">This page couldn&apos;t be loaded properly.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="px-4 py-2 rounded-full bg-orange-500 text-white text-sm font-bold cursor-pointer">Try again</button>
          <button onClick={() => router.back()} className="px-4 py-2 rounded-full border border-gray-200 text-gray-600 text-sm font-bold cursor-pointer">← Go Back</button>
        </div>
      </div>
    </div>
  );
}
