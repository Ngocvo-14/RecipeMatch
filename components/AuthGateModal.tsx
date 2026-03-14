'use client';

interface Props {
  onClose: () => void;
  onSignUp: () => void;
}

export default function AuthGateModal({ onClose, onSignUp }: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl p-7 w-full max-w-xs mx-4 shadow-2xl text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl" style={{ background: '#FFF5F5' }}>
          🤍
        </div>
        <h2 className="text-xl font-black text-[#2C2C2C] mb-2">You&apos;re not registered</h2>
        <p className="text-sm font-semibold text-[#666] mb-6 leading-relaxed">
          You need an account to save recipes. Would you like to sign up now?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm font-black text-[#999] hover:text-[#666] transition-colors rounded-full border border-[#E8ECEF] bg-[#F8F9FA]"
          >
            NO
          </button>
          <button
            onClick={onSignUp}
            className="flex-1 py-3 text-sm font-black text-white rounded-full transition-all hover:opacity-90 shadow-sm"
            style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' }}
          >
            YES
          </button>
        </div>
      </div>
    </div>
  );
}
