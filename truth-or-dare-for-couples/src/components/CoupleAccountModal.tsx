import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  ShieldCheck,
  LogOut,
  LogIn,
  CheckCircle2,
  RefreshCw,
  KeyRound,
  User,
  Heart,
  Cloud,
} from 'lucide-react';
import { syncCoupleUnlockedCards, type CoupleSession } from '../utils/coupleSession';

interface CoupleAccountModalProps {
  coupleSession: CoupleSession | null;
  unlockedCardIds: string[];
  onLogin: (coupleName: string, pin: string) => Promise<void>;
  onRegister: (coupleName: string, pin: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onClose: () => void;
  onRefreshUnlocked?: (cards: string[]) => void;
}

export const CoupleAccountModal: React.FC<CoupleAccountModalProps> = ({
  coupleSession,
  unlockedCardIds,
  onLogin,
  onRegister,
  onLogout,
  onClose,
  onRefreshUnlocked,
}) => {
  const [coupleName, setCoupleName] = useState(coupleSession?.coupleName || 'khanhnhim21102004@gmail.com');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const isLoggedIn = Boolean(coupleSession?.loggedIn && coupleSession.coupleName);

  const handleSyncNow = async () => {
    setSyncBusy(true);
    setError(null);
    setSuccessNotice(null);
    try {
      const res = await syncCoupleUnlockedCards(unlockedCardIds);
      if (res && res.success) {
        setSuccessNotice(`Đã lưu và đồng bộ thành công ${res.unlockedCardIds.length} lá bài lên đám mây!`);
        if (onRefreshUnlocked) {
          onRefreshUnlocked(res.unlockedCardIds);
        }
      } else {
        throw new Error('Không thể đồng bộ thẻ lúc này. Vui lòng thử lại.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi đồng bộ.');
    } finally {
      setSyncBusy(false);
    }
  };

  const handleQuickLoginKhanh = async () => {
    setBusy(true);
    setError(null);
    setSuccessNotice(null);
    try {
      await onLogin('khanhnhim21102004@gmail.com', '');
      setSuccessNotice('Đã đăng nhập thành công vào khanhnhim21102004@gmail.com!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đăng nhập.');
    } finally {
      setBusy(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent, isRegister: boolean = false) => {
    e.preventDefault();
    const name = coupleName.trim();
    if (!name || name.length < 2) {
      setError('Vui lòng nhập email hoặc tên cặp đôi (tối thiểu 2 ký tự).');
      return;
    }
    setBusy(true);
    setError(null);
    setSuccessNotice(null);
    try {
      if (isRegister) {
        await onRegister(name, pin);
        setSuccessNotice(`Đã tạo tài khoản "${name}" thành công với 0 thẻ mở!`);
      } else {
        await onLogin(name, pin);
        setSuccessNotice(`Đã đăng nhập thành công vào "${name}"!`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra.');
    } finally {
      setBusy(false);
    }
  };

  const handleLogoutClick = async () => {
    setBusy(true);
    try {
      await onLogout();
      setSuccessNotice(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đăng xuất.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-rose-500/30 bg-[#160b13] p-6 text-white shadow-2xl"
      >
        {/* Glow backdrop */}
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-48 bg-rose-500/20 rounded-full blur-3xl" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-2xl border border-rose-400/30 bg-rose-500/15">
              <Sparkles className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h2 id="account-modal-title" className="text-base font-bold text-white">
                Tài Khoản & Đồng Bộ Thẻ
              </h2>
              <p className="text-xs text-neutral-400">Ghi nhớ số thẻ đã mở trên mọi thiết bị</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Notices */}
        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-200">
            {error}
          </div>
        )}
        {successNotice && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs text-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Account Info Box */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Trạng thái tài khoản
              </span>
              {isLoggedIn ? (
                <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-emerald-300">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span className="truncate max-w-[210px] text-white">{coupleSession?.coupleName}</span>
                </div>
              ) : (
                <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-300">
                  <User className="h-4 w-4" />
                  <span>Chưa đăng nhập (Khách vãng lai)</span>
                </div>
              )}
            </div>

            <div className="text-right">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Thẻ đã mở
              </span>
              <p className="mt-1 text-sm font-bold text-amber-300">
                {unlockedCardIds.length} <span className="text-xs font-normal text-neutral-400">bài</span>
              </p>
            </div>
          </div>

          {/* Quick sync or logout buttons if logged in */}
          {isLoggedIn ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={handleSyncNow}
                disabled={syncBusy}
                className="flex flex-1 min-h-10 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/50 px-3 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-900/60 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncBusy ? 'animate-spin' : ''}`} />
                {syncBusy ? 'Đang lưu…' : 'Đồng bộ lại thẻ'}
              </button>

              <button
                type="button"
                onClick={handleLogoutClick}
                disabled={busy}
                className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/60 px-4 text-xs font-bold text-rose-300 transition-colors hover:bg-rose-900/70 hover:text-white disabled:opacity-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                Đăng xuất
              </button>
            </div>
          ) : (
            <div className="mt-3 border-t border-white/10 pt-3">
              <p className="text-[11px] text-neutral-400 mb-2.5">
                Lưu toàn bộ {unlockedCardIds.length} thẻ đang có vào tài khoản của bạn:
              </p>
              <button
                type="button"
                onClick={handleQuickLoginKhanh}
                disabled={busy}
                className="flex w-full min-h-10 items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500/25 to-rose-500/25 px-3 py-2 text-xs font-bold text-amber-100 transition-all hover:border-amber-300 disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                Đăng nhập & Lưu vào "khanhnhim21102004@gmail.com"
              </button>
            </div>
          )}
        </div>

        {/* Change account / Sign in form */}
        <form
          onSubmit={(e) => handleFormSubmit(e, false)}
          className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4"
        >
          <p className="text-xs font-semibold text-neutral-300">
            {isLoggedIn ? 'Chuyển sang tài khoản khác' : 'Đăng nhập hoặc đăng ký tài khoản'}
          </p>

          <div>
            <label htmlFor="modal-couple-name" className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Email hoặc Tên Cặp Đôi
            </label>
            <input
              id="modal-couple-name"
              type="text"
              value={coupleName}
              onChange={(e) => setCoupleName(e.target.value)}
              placeholder="khanhnhim21102004@gmail.com"
              className="mt-1 min-h-10 w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 text-xs text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-rose-400 focus:ring-1 focus:ring-rose-400/30"
            />
          </div>

          <div>
            <label htmlFor="modal-couple-pin" className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Mã PIN (Tùy chọn)
            </label>
            <div className="relative mt-1">
              <input
                id="modal-couple-pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Để trống nếu không đặt mã PIN"
                className="min-h-10 w-full rounded-xl border border-white/12 bg-white/[0.04] pl-3 pr-8 text-xs text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-rose-400 focus:ring-1 focus:ring-rose-400/30"
              />
              <KeyRound className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-neutral-500" />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 min-h-10 rounded-xl bg-rose-500 px-3 text-xs font-bold text-white transition-all hover:bg-rose-600 disabled:opacity-50"
            >
              {busy ? 'Đang xử lý…' : 'Đăng nhập & Lưu'}
            </button>
            <button
              type="button"
              onClick={(e) => handleFormSubmit(e, true)}
              disabled={busy}
              className="rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-semibold text-neutral-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              Tạo mới (0 thẻ)
            </button>
          </div>
        </form>

        <p className="mt-3.5 text-center text-[10px] text-neutral-500">
          🔒 Tiến trình mở bài tự động lưu liên tục sau mỗi lượt chơi.
        </p>
      </motion.div>
    </div>
  );
};
