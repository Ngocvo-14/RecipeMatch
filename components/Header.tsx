'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface User { _id: string; email: string; username?: string; createdAt?: string }
interface HeaderProps {
  user: User | null;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, username?: string) => Promise<void>;
  onLogout: () => void;
  onLogoClick?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  isSearching?: boolean;
}

export default function Header({ user, onLogin, onRegister, onLogout, onLogoClick, searchQuery = '', onSearchChange, isSearching }: HeaderProps) {
  const router = useRouter();
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function switchMode(login: boolean) {
    setIsLogin(login);
    setError('');
    setEmail('');
    setUsername('');
    setPassword('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!isLogin && username) {
      if (username.length < 3) { setError('Username must be at least 3 characters'); return; }
      if (username.length > 20) { setError('Username must be at most 20 characters'); return; }
      if (/\s/.test(username)) { setError('Username cannot contain spaces'); return; }
    }
    setLoading(true);
    try {
      if (isLogin) await onLogin(email, password);
      else await onRegister(email, password, username || undefined);
      setShowAuth(false);
      setEmail(''); setUsername(''); setPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const displayName = user
    ? (user.username || user.email.split('@')[0])
    : '';

  const inputClass = 'w-full border border-[#E8ECEF] rounded-2xl px-4 py-3 text-sm text-[#2C2C2C] font-semibold focus:outline-none focus:border-[#FF6B6B] transition-colors placeholder:text-[#bbb] placeholder:font-normal bg-[#F8F9FA]';

  return (
    <>
      <header className="h-14 bg-white border-b border-[#E8ECEF] flex items-center px-5 gap-4 shrink-0 shadow-sm">
        {/* Logo */}
        <button
          onClick={() => {
            try {
              sessionStorage.removeItem('rm_ingredients');
              sessionStorage.removeItem('rm_filters');
              sessionStorage.removeItem('rm_search');
            } catch { /* ignore */ }
            onLogoClick?.();
            router.push('/');
          }}
          className="flex items-center gap-2 mr-auto"
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg" style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' }}>
            🍳
          </div>
          <span className="font-black text-xl tracking-tight" style={{ color: '#FF6B6B' }}>
            RecipeMatch
          </span>
        </button>

        {/* Search bar — always visible top-right */}
        <div className="relative flex items-center">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb] pointer-events-none">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search recipes..."
            className="pl-9 pr-8 py-2 text-sm font-semibold rounded-full border border-[#E8ECEF] bg-[#F8F9FA] focus:outline-none focus:border-[#FF6B6B] transition-colors w-52"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange?.('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#bbb] hover:text-[#666] font-black text-sm"
            >×</button>
          )}
          {isSearching && !searchQuery && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FF6B6B', borderTopColor: 'transparent' }} />
          )}
        </div>

        {user ? (
          <div className="flex items-center gap-4">
            <Link
              href="/library"
              className="text-sm font-bold text-[#666] hover:text-[#FF6154] transition-colors"
            >
              {displayName}
            </Link>
            <button onClick={onLogout} className="text-sm font-bold text-[#999] hover:text-[#FF6B6B] transition-colors">
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setIsLogin(true); setShowAuth(true); }}
            className="text-sm font-black text-white px-5 py-2 rounded-full transition-all hover:opacity-90 shadow-sm"
            style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' }}
          >
            Sign In
          </button>
        )}
      </header>

      {showAuth && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAuth(false); }}
        >
          <div className="bg-white rounded-3xl p-7 w-full max-w-sm mx-4 shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-black text-[#2C2C2C]">
                {isLogin ? 'Welcome back! 👋' : 'Join RecipeMatch 🍳'}
              </h2>
              <button
                onClick={() => setShowAuth(false)}
                className="text-[#999] hover:text-[#2C2C2C] text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                ×
              </button>
            </div>

            {/* Sign In / Register tabs */}
            <div className="flex bg-[#F8F9FA] rounded-2xl p-1 mb-5">
              {['Sign In', 'Register'].map((label, i) => (
                <button
                  key={label}
                  onClick={() => switchMode(i === 0)}
                  className="flex-1 py-2 rounded-xl text-sm font-black transition-all"
                  style={isLogin === (i === 0)
                    ? { background: 'white', color: '#2C2C2C', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }
                    : { color: '#999' }}
                >
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Email address"
                className={inputClass}
              />

              {/* Username field — only on register */}
              {!isLogin && (
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                  placeholder="Username (min 3 chars, no spaces)"
                  maxLength={20}
                  className={inputClass}
                />
              )}

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Password (min 6 chars)"
                className={inputClass}
              />

              {error && (
                <div className="bg-red-50 text-red-500 text-sm px-4 py-3 rounded-2xl font-semibold border border-red-100">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white font-black py-3 rounded-full transition-all disabled:opacity-50 hover:opacity-90 shadow-sm text-sm mt-1"
                style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' }}
              >
                {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
