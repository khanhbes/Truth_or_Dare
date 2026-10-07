import React, { useState } from 'react';
import { Heart, KeyRound, LogIn, ShieldCheck, Sparkles, UserPlus, Users } from 'lucide-react';

interface PlayerLoginScreenProps {
  onLogin: (displayName: string) => Promise<void>;
  onCoupleLogin?: (coupleName: string, pin: string) => Promise<void>;
  onCoupleRegister?: (coupleName: string, pin: string) => Promise<void>;
  initialError?: string | null;
}

export const PlayerLoginScreen: React.FC<PlayerLoginScreenProps> = ({
  onLogin,
  onCoupleLogin,
  onCoupleRegister,
  initialError,
}) => {
  const [authMode, setAuthMode] = useState<'couple' | 'guest'>('couple');
  const [coupleAction, setCoupleAction] = useState<'login' | 'register'>('login');
  const [coupleName, setCoupleName] = useState('');
  const [pin, setPin] = useState('');
  const [guestName, setGuestName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError || '');

  const handleCoupleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedName = coupleName.replace(/\s+/g, ' ').trim();
    const trimmedPin = pin.trim();

    if (!normalizedName || normalizedName.length < 2 || normalizedName.length > 40) {
      setError('Tên cặp đôi phải có từ 2 đến 40 ký tự.');
      return;
    }
    if (!/^[0-9]{4,8}$/.test(trimmedPin)) {
      setError('Mã PIN bảo mật phải gồm từ 4 đến 8 chữ số.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      if (coupleAction === 'register') {
        if (!onCoupleRegister) throw new Error('Tính năng đăng ký chưa sẵn sàng.');
        await onCoupleRegister(normalizedName, trimmedPin);
      } else {
        if (!onCoupleLogin) throw new Error('Tính năng đăng nhập chưa sẵn sàng.');
        await onCoupleLogin(normalizedName, trimmedPin);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể kết nối máy chủ.');
    } finally {
      setBusy(false);
    }
  };

  const handleGuestSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = guestName.replace(/\s+/g, ' ').trim();
    if (!normalized || normalized.length > 40) {
      setError('Nhập tên hiển thị từ 1 đến 40 ký tự.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onLogin(normalized);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Không thể đăng nhập lúc này.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#12090f] px-4 py-8 text-white sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(244,63,94,0.2),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_55%)]" />

      <section className="relative w-full max-w-md text-center">
        {/* Glowing Badge */}
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full border border-rose-200/25 bg-rose-300/10 shadow-[0_0_45px_rgba(244,63,94,0.25)]">
          <Heart className="h-8 w-8 fill-rose-300/25 text-rose-200" aria-hidden="true" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-rose-200/70">
          True or Dare for Couples
        </p>
        <h1 className="mt-2 font-serif-romantic text-3xl font-bold leading-tight text-rose-50 sm:text-4xl">
          Chào Mừng Cặp Đôi
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-neutral-400 sm:text-sm">
          Đăng nhập tài khoản để tự động ghi nhớ toàn bộ số bài đã mở và ưu tiên bài mới lạ.
        </p>

        {/* Tab Switcher */}
        <div className="mt-6 flex rounded-2xl border border-white/10 bg-white/[0.04] p-1 text-xs">
          <button
            type="button"
            onClick={() => {
              setAuthMode('couple');
              setError('');
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 font-semibold transition-all ${
              authMode === 'couple'
                ? 'bg-rose-500/25 text-rose-200 shadow-sm ring-1 ring-rose-400/30'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" /> Tài khoản Cặp đôi
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('guest');
              setError('');
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 font-semibold transition-all ${
              authMode === 'guest'
                ? 'bg-rose-500/25 text-rose-200 shadow-sm ring-1 ring-rose-400/30'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Users className="h-3.5 w-3.5" /> Chơi nhanh (Khách)
          </button>
        </div>

        {authMode === 'couple' ? (
          <form onSubmit={handleCoupleSubmit} className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-5 text-left backdrop-blur-xl">
            {/* Sub-action pill */}
            <div className="mb-4 flex justify-center gap-2 border-b border-white/10 pb-3 text-xs">
              <button
                type="button"
                onClick={() => {
                  setCoupleAction('login');
                  setError('');
                }}
                className={`rounded-lg px-3 py-1 font-medium transition-colors ${
                  coupleAction === 'login'
                    ? 'bg-white/15 text-white font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => {
                  setCoupleAction('register');
                  setError('');
                }}
                className={`rounded-lg px-3 py-1 font-medium transition-colors ${
                  coupleAction === 'register'
                    ? 'bg-rose-500/30 text-rose-200 font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Tạo tài khoản mới
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label htmlFor="couple-name" className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-300">
                  Tên cặp đôi
                </label>
                <input
                  id="couple-name"
                  value={coupleName}
                  onChange={(e) => setCoupleName(e.target.value)}
                  maxLength={40}
                  autoComplete="nickname"
                  autoFocus
                  placeholder="Ví dụ: Minh & An"
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-rose-400/60 focus:ring-1 focus:ring-rose-400/30"
                />
              </div>

              <div>
                <label htmlFor="couple-pin" className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-300">
                  Mã PIN bảo mật (4–8 số)
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
                    placeholder="••••"
                    className="min-h-11 w-full rounded-xl border border-white/12 bg-white/[0.04] pl-3.5 pr-9 text-sm text-white tracking-widest outline-none transition-colors placeholder:text-neutral-600 focus:border-rose-400/60 focus:ring-1 focus:ring-rose-400/30"
                  />
                  <KeyRound className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-neutral-500" />
                </div>
              </div>

              {error && <p role="alert" className="text-xs leading-relaxed text-rose-300">{error}</p>}

              <button
                type="submit"
                disabled={busy}
                className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-400 to-rose-300 font-bold text-[#200912] shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {coupleAction === 'login' ? (
                  <>
                    <LogIn className="h-4 w-4" /> {busy ? 'Đang kiểm tra…' : 'Đăng nhập & Bắt đầu'}
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" /> {busy ? 'Đang khởi tạo…' : 'Tạo tài khoản & Lưu tiến trình'}
                  </>
                )}
              </button>
            </div>

            <p className="mt-3.5 text-center text-[11px] text-neutral-400">
              🔒 Bài đã mở sẽ tự động đồng bộ trên đám mây, không bao giờ bị mất.
            </p>
          </form>
        ) : (
          <form onSubmit={handleGuestSubmit} className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-5 text-left backdrop-blur-xl">
            <label htmlFor="guest-display-name" className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-300">
              Tên hiển thị nhanh
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="guest-display-name"
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
                maxLength={40}
                autoComplete="nickname"
                autoFocus
                placeholder="Ví dụ: Minh & An"
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-rose-400/60 focus:ring-1 focus:ring-rose-400/30"
              />
              <button
                type="submit"
                disabled={busy}
                className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-rose-400 px-4 text-sm font-bold text-[#250b14] hover:bg-rose-300 disabled:opacity-60"
              >
                <LogIn className="h-4 w-4" /> {busy ? 'Đang vào…' : 'Vào ngay'}
              </button>
            </div>
            {error && <p role="alert" className="mt-3 text-xs leading-relaxed text-rose-300">{error}</p>}
            <p className="mt-3 text-center text-[11px] text-neutral-500">
              Chế độ chơi nhanh không bảo mật bằng mã PIN; tiến trình chỉ lưu trong máy này.
            </p>
          </form>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[11px] text-neutral-500">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Dành riêng cho 2 người
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Bảo mật & riêng tư tuyệt đối
          </span>
        </div>
      </section>
    </main>
  );
};
