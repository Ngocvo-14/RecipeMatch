'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/user/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-md" style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' }}>
            🍽️
          </div>
          <span className="font-black text-[#2C2C2C] text-2xl tracking-tight">RecipeMatch</span>
        </Link>

        <div className="bg-white rounded-3xl border border-[#F0F0F0] p-7 shadow-sm">
          <h1 className="text-2xl font-black text-[#2C2C2C] mb-1">Welcome back</h1>
          <p className="text-[#999] font-semibold text-sm mb-6">Sign in to access your recipes and collections.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-[#999] uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-[#F8F9FA] border border-[#E8ECEF] rounded-2xl px-4 py-3 text-sm text-[#2C2C2C] font-semibold placeholder:text-[#CCC] focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                style={{ '--tw-ring-color': '#FF6B6B' } as React.CSSProperties}
              />
            </div>
            <div>
              <label className="block text-xs font-black text-[#999] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Your password"
                className="w-full bg-[#F8F9FA] border border-[#E8ECEF] rounded-2xl px-4 py-3 text-sm text-[#2C2C2C] font-semibold placeholder:text-[#CCC] focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                style={{ '--tw-ring-color': '#FF6B6B' } as React.CSSProperties}
              />
            </div>

            {error && (
              <div className="bg-[#FFF5F5] border border-[#FFE0E0] text-[#FF6B6B] text-sm font-semibold px-4 py-3 rounded-2xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-black py-3 rounded-full transition-all hover:opacity-90 disabled:opacity-50 text-sm mt-2 shadow-md"
              style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-[#999] font-semibold text-sm mt-5">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-black hover:opacity-80 transition-opacity" style={{ color: '#FF6B6B' }}>
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
