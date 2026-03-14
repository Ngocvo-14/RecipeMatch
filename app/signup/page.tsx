'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function validateUsername(val: string): string | null {
    if (!val) return null; // optional
    if (val.length < 3) return 'Username must be at least 3 characters';
    if (val.length > 20) return 'Username must be at most 20 characters';
    if (/\s/.test(val)) return 'Username cannot contain spaces';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const usernameErr = validateUsername(username);
    if (usernameErr) { setError(usernameErr); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/user/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username: username || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'w-full bg-[#F8F9FA] border border-[#E8ECEF] rounded-2xl px-4 py-3 text-sm text-[#2C2C2C] font-semibold placeholder:text-[#CCC] focus:outline-none focus:ring-2 focus:border-transparent transition-all';

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
          <h1 className="text-2xl font-black text-[#2C2C2C] mb-1">Create account</h1>
          <p className="text-[#999] font-semibold text-sm mb-6">Start saving your favorite recipes.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-[#999] uppercase tracking-wider mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className={inputClass}
                style={{ '--tw-ring-color': '#FF6B6B' } as React.CSSProperties}
              />
            </div>

            <div>
              <label className="block text-xs font-black text-[#999] uppercase tracking-wider mb-1.5">
                Username <span className="normal-case font-bold text-[#bbb]">(optional)</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                placeholder="Choose a username"
                minLength={3}
                maxLength={20}
                className={inputClass}
                style={{ '--tw-ring-color': '#FF6B6B' } as React.CSSProperties}
              />
              <p className="text-[10px] font-semibold text-[#bbb] mt-1 pl-1">3–20 characters, no spaces</p>
            </div>

            <div>
              <label className="block text-xs font-black text-[#999] uppercase tracking-wider mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="At least 6 characters"
                className={inputClass}
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
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-[#999] font-semibold text-sm mt-5">
            Already have an account?{' '}
            <Link href="/login" className="font-black hover:opacity-80 transition-opacity" style={{ color: '#FF6B6B' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
