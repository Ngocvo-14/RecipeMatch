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

  const inputClass = 'w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-orange-300 transition-colors placeholder:text-gray-400 bg-gray-50';

  return (
    <>
      <header className="h-14 bg-white border-b border-gray-100 flex items-center px-5 gap-4 shrink-0">
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
          className="flex items-center gap-3 mr-auto group cursor-pointer"
        >
          <div className="relative">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="19" fill="#FFF7ED" stroke="#FED7AA" strokeWidth="1.5"/>
              <circle cx="20" cy="20" r="15" fill="none" stroke="#FDBA74" strokeWidth="0.5" strokeDasharray="2 3"/>
              <line x1="13" y1="9" x2="13" y2="14" stroke="#F97316" strokeWidth="2" strokeLinecap="round"/>
              <line x1="15.5" y1="9" x2="15.5" y2="14" stroke="#F97316" strokeWidth="2" strokeLinecap="round"/>
              <path d="M13 14 Q14.25 16 14.25 17.5 L14.25 30" stroke="#F97316" strokeWidth="2" strokeLinecap="round"/>
              <ellipse cx="25" cy="12" rx="2.8" ry="3.5" stroke="#EA580C" strokeWidth="2"/>
              <line x1="25" y1="15.5" x2="25" y2="30" stroke="#EA580C" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="31" cy="10" r="2.5" fill="#FCD34D"/>
              <circle cx="31" cy="10" r="1.2" fill="#F59E0B"/>
            </svg>
            <span className="absolute top-1.5 right-1 w-2 h-2 rounded-full bg-yellow-400 opacity-75 animate-ping" />
          </div>
          <div className="flex items-baseline gap-0">
            <span className="text-gray-900 font-extrabold text-xl tracking-tight group-hover:text-gray-700 transition-colors">Recipe</span>
            <span className="font-extrabold text-xl tracking-tight text-orange-500">
              Match
            </span>
          </div>
        </button>

        {user ? (
          <div className="flex items-center gap-3">
            {/* Desktop: show full name + sign out */}
            <Link href="/library" className="hidden sm:block text-sm text-gray-700 hover:text-orange-500 transition-colors cursor-pointer">
              {displayName}
            </Link>
            <button onClick={onLogout} className="hidden sm:block text-sm text-gray-700 hover:text-orange-500 relative group cursor-pointer transition-colors">
              <span className="relative">
                Sign out
                <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-orange-500 group-hover:w-full transition-all duration-200 rounded-full" />
              </span>
            </button>
            {/* Mobile: avatar initial */}
            <Link href="/library" className="sm:hidden w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm font-black text-orange-600 cursor-pointer">
              {displayName.charAt(0).toUpperCase()}
            </Link>
          </div>
        ) : (
          <button
            onClick={() => { setIsLogin(true); setShowAuth(true); }}
            className="text-sm font-bold text-white px-4 py-2 sm:px-5 rounded-full transition-all hover:opacity-90 shadow-sm cursor-pointer"
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
              <h2 className="text-xl font-black text-gray-900">
                {isLogin ? 'Welcome back! 👋' : 'Join RecipeMatch 🍳'}
              </h2>
              <button
                onClick={() => setShowAuth(false)}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Sign In / Register tabs */}
            <div className="flex bg-gray-100 rounded-2xl p-1 mb-5">
              {['Sign In', 'Register'].map((label, i) => (
                <button
                  key={label}
                  onClick={() => switchMode(i === 0)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    isLogin === (i === 0)
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email address" className={inputClass} />
              {!isLogin && (
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))} placeholder="Username (min 3 chars, no spaces)" maxLength={20} className={inputClass} />
              )}
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Password (min 6 chars)" className={inputClass} />

              {error && (
                <div className="bg-red-50 text-red-500 text-sm px-4 py-3 rounded-2xl border border-red-100">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white font-bold py-3 rounded-full transition-all disabled:opacity-50 hover:opacity-90 shadow-sm text-sm mt-1 cursor-pointer"
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
