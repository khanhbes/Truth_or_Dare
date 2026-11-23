import React, { useState } from 'react';
import { ArrowRight, Heart, KeyRound, LogIn, UserPlus } from 'lucide-react';
import { AdminModeButton } from './AdminModeButton';

interface PlayerLoginScreenProps {
  onLogin: (displayName: string) => Promise<void>;
  onCoupleLogin?: (coupleName: string, pin: string) => Promise<void>;
  onCoupleRegister?: (coupleName: string, pin: string) => Promise<void>;
  onSkip?: () => void;
  initialError?: string | null;
}

const GUEST_DISPLAY_NAME = 'Khách';

export const PlayerLoginScreen: React.FC<PlayerLoginScreenProps> = ({
  onLogin,
  onCoupleLogin,
  onCoupleRegister,
  onSkip,
  initialError,
}) => {
  const [coupleAction, setCoupleAction] = useState<'login' | 'register'>('login');
  const [coupleName, setCoupleName] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState<'account' | 'guest' | null>(null);
  const [error, setError] = useState(initialError || '');
  const isRegister = coupleAction === 'register';

  const switchAction = (next: 'login' | 'register') => {
    setCoupleAction(next);
    setError('');
  };

  const handleCoupleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedName = coupleName.replace(/\s+/g, ' ').trim();
    const trimmedPin = pin.trim();

    if (normalizedName.length < 2 || normalizedName.length > 120) {
      setError('Nhập tên tài khoản hoặc email (từ 2 đến 120 ký tự).');
      return;
    }
    if (!/^[0-9]{4,8}$/.test(trimmedPin)) {
      setError('Mã PIN gồm 4 đến 8 chữ số.');
      return;
    }

    setBusy('account');
    setError('');
    try {
      if (isRegister) {
        if (!onCoupleRegister) throw new Error('Tính năng tạo tài khoản chưa sẵn sàng.');
        await onCoupleRegister(normalizedName, trimmedPin);
      } else {
        if (!onCoupleLogin) throw new Error('Tính năng đăng nhập chưa sẵn sàng.');
        await onCoupleLogin(normalizedName, trimmedPin);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể kết nối máy chủ.');
    } finally {
      setBusy(null);
    }
  };

  // One way in without an account: a guest session when the server is
  // reachable (keeps the player counted), otherwise play fully offline.
  const handleGuest = async () => {
    setBusy('guest');
    setError('');
    try {
      await onLogin(GUEST_DISPLAY_NAME);
    } catch {
      if (onSkip) onSkip();
      else setError('Không thể vào chế độ khách lúc này.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#12090f] px-4 py-8 text-white sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(244,63,94,0.2),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_55%)]" />

      <section className="screen-enter relative w-full max-w-sm text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full border border-rose-200/25 bg-rose-300/10 shadow-[0_0_45px_rgba(244,63,94,0.25)]">
          <Heart className="h-7 w-7 fill-rose-300/25 text-rose-200" aria-hidden="true" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-rose-200/70">Truth or Dare · Cặp đôi</p>
        <h1 className="mt-2 font-serif-romantic text-3xl font-bold leading-tight text-rose-50">
          {isRegister ? 'Tạo tài khoản' : 'Chào mừng trở lại'}
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-neutral-400">
          {isRegister
            ? 'Một tài khoản chung cho hai bạn, lưu lại mọi lá bài đã mở.'
            : 'Đăng nhập để tiếp tục với những lá bài hai bạn đã mở.'}
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5 text-left backdrop-blur-xl">
          <div className="mb-5 grid grid-cols-2 rounded-xl bg-white/[0.05] p-1 text-xs" role="tablist" aria-label="Đăng nhập hoặc tạo tài khoản">
            {(['login', 'register'] as const).map((action) => (
              <button
                key={action}
                type="button"
                role="tab"
                aria-selected={coupleAction === action}
                onClick={() => switchAction(action)}
                className={`min-h-9 rounded-lg font-semibold transition-colors ${
                  coupleAction === action ? 'bg-rose-400/20 text-rose-100 ring-1 ring-rose-300/35' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {action === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
              </button>
            ))}
          </div>

          <form onSubmit={handleCoupleSubmit} className="space-y-4">
            <div>
              <label htmlFor="couple-name" className="block text-xs font-medium text-neutral-300">
                Tên tài khoản hoặc email
              </label>
              <input
                id="couple-name"
                value={coupleName}
                onChange={(e) => setCoupleName(e.target.value)}
                maxLength={120}
                autoComplete="username"
                autoFocus
                placeholder="vd: minh-va-lan"
                className="mt-1.5 min-h-11 w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-rose-400/60 focus:ring-1 focus:ring-rose-400/30"
              />
            </div>

            <div>
              <label htmlFor="couple-pin" className="block text-xs font-medium text-neutral-300">
                Mã PIN <span className="text-neutral-500">(4–8 chữ số)</span>
              </label>
              <div className="relative mt-1.5">
                <input
                  id="couple-pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  placeholder={isRegister ? 'Đặt mã PIN cho tài khoản' : 'Nhập mã PIN'}
                  className="min-h-11 w-full rounded-xl border border-white/12 bg-white/[0.04] pl-3.5 pr-9 text-sm tracking-widest text-white outline-none transition-colors placeholder:tracking-normal placeholder:text-neutral-600 focus:border-rose-400/60 focus:ring-1 focus:ring-rose-400/30"
                />
                <KeyRound className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-neutral-500" aria-hidden="true" />
              </div>
            </div>

            {error && <p role="alert" className="text-xs leading-relaxed text-rose-300">{error}</p>}

            <button
              type="submit"
              disabled={busy !== null}
              className="btn-shine flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-400 to-rose-300 text-sm font-bold text-[#200912] shadow-lg disabled:opacity-50"
            >
              {isRegister ? <UserPlus className="h-4 w-4" aria-hidden="true" /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
              {busy === 'account'
                ? (isRegister ? 'Đang tạo…' : 'Đang kiểm tra…')
                : (isRegister ? 'Tạo tài khoản' : 'Đăng nhập')}
            </button>
          </form>
        </div>

        <div className="my-5 flex items-center gap-3 text-[11px] text-neutral-500" aria-hidden="true">
          <span className="h-px flex-1 bg-white/10" /> hoặc <span className="h-px flex-1 bg-white/10" />
        </div>

        <button
          type="button"
          onClick={() => void handleGuest()}
          disabled={busy !== null}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] text-sm font-semibold text-neutral-100 transition-colors hover:border-rose-200/40 hover:bg-white/[0.06] disabled:opacity-50"
        >
          {busy === 'guest' ? 'Đang vào…' : 'Chơi ngay, không cần tài khoản'}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
        <p className="mt-2 text-[11px] text-neutral-500">Lá bài đã mở chỉ được lưu trên máy này.</p>

        <div className="mt-8">
          <AdminModeButton />
        </div>
      </section>
    </main>
  );
};
