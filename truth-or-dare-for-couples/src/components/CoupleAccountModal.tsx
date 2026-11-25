import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  X,
  Sparkles,
  ShieldCheck,
  LogOut,
  CheckCircle2,
  CloudOff,
  RefreshCw,
  KeyRound,
  User,
  ChevronDown,
} from 'lucide-react';
import { syncCoupleUnlockedCards, type CoupleSession } from '../utils/coupleSession';
import { ConfirmDialog } from './ConfirmDialog';
import { dialogPanelMotion } from '../utils/motionTokens';
import { useDialogFocus } from './useDialogFocus';

interface CoupleAccountModalProps {
  coupleSession: CoupleSession | null;
  unlockedCardIds: string[];
  onLogin: (coupleName: string, pin: string) => Promise<void>;
  onRegister: (coupleName: string, pin: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onClose: () => void;
  onRefreshUnlocked?: (cards: string[]) => void;
  /** Signing out drops the running game, so it asks first. */
  gameInProgress?: boolean;
  /** Opened cards that could not be sent to the account yet. */
  unlockSyncPending?: boolean;
}

export const CoupleAccountModal: React.FC<CoupleAccountModalProps> = ({
  coupleSession,
  unlockedCardIds,
  onLogin,
  onRegister,
  onLogout,
  onClose,
  onRefreshUnlocked,
  gameInProgress = false,
  unlockSyncPending = false,
}) => {
  const dialogRef = useDialogFocus<HTMLDivElement>({ onEscape: onClose });
  const shouldReduceMotion = useReducedMotion();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [coupleName, setCoupleName] = useState('');
  // Signed-in couples rarely switch accounts: keep that form folded away.
  const [showSwitchForm, setShowSwitchForm] = useState(() => !(coupleSession?.loggedIn && coupleSession.coupleName));
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
        throw new Error('Không thể đồng bộ lá bài lúc này. Vui lòng thử lại.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi đồng bộ.');
    } finally {
      setSyncBusy(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent, isRegister: boolean = false) => {
    e.preventDefault();
    const name = coupleName.trim();
    if (!name || name.length < 2) {
      setError('Vui lòng nhập email hoặc tên cặp đôi (tối thiểu 2 ký tự).');
      return;
    }
    if (!/^[0-9]{4,8}$/.test(pin.trim())) {
      setError('Mã PIN phải gồm từ 4 đến 8 chữ số.');
      return;
    }
    setBusy(true);
    setError(null);
    setSuccessNotice(null);
    try {
      if (isRegister) {
        await onRegister(name, pin);
        setSuccessNotice(`Đã tạo tài khoản "${name}" thành công với 0 lá đã mở!`);
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

  const handleLogout = async () => {
    setConfirmLogout(false);
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
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <motion.div
        ref={dialogRef}
        tabIndex={-1}
        {...dialogPanelMotion(Boolean(shouldReduceMotion))}
        className="relative max-h-[calc(100svh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl border border-rose-500/30 bg-[#160b13] p-5 text-white shadow-2xl sm:p-6"
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
                Tài khoản và đồng bộ
              </h2>
              <p className="text-xs text-neutral-300">Giữ lá đã mở trên mọi thiết bị</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Notices */}
        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-sm text-rose-200">
            {error}
          </div>
        )}
        {successNotice && (
          <div role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-sm text-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {isLoggedIn && unlockSyncPending && (
          <div role="status" className="mt-4 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm leading-relaxed text-amber-100">
            <CloudOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Có lá bài chưa đồng bộ. Các lá này vẫn được giữ trên máy và sẽ tự gửi lại khi có mạng.</span>
          </div>
        )}

        {/* Account Info Box */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs font-medium text-neutral-300">
                Trạng thái tài khoản
              </span>
              {isLoggedIn ? (
                <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-emerald-300">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span className="truncate max-w-[210px] text-white">{coupleSession?.coupleName}</span>
                </div>
              ) : (
                <div className="mt-1 flex items-center gap-1.5 text-sm text-amber-200">
                  <User className="h-4 w-4" aria-hidden="true" />
                  <span>Chưa đăng nhập (khách)</span>
                </div>
              )}
            </div>

            <div className="text-right">
              <span className="text-xs font-medium text-neutral-300">
                Lá đã mở
              </span>
              <p className="mt-1 text-sm font-bold text-amber-300">
                {unlockedCardIds.length} <span className="text-xs font-normal text-neutral-300">lá</span>
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
                className="flex flex-1 min-h-11 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/50 px-3 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-900/60 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncBusy ? 'animate-spin' : ''}`} />
                {syncBusy ? 'Đang lưu…' : 'Đồng bộ lại'}
              </button>

              <button
                type="button"
                onClick={() => (gameInProgress ? setConfirmLogout(true) : void handleLogout())}
                disabled={busy}
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/60 px-4 text-sm font-bold text-rose-200 transition-colors hover:bg-rose-900/70 hover:text-white disabled:opacity-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                Đăng xuất
              </button>
            </div>
          ) : (
            <div className="mt-3 border-t border-white/10 pt-3">
              <p className="text-xs leading-relaxed text-neutral-300">
                Đăng nhập hoặc tạo tài khoản bên dưới để giữ lá đã mở và dùng bộ bài riêng của hai bạn.
              </p>
            </div>
          )}
        </div>

        {/* Change account / Sign in form */}
        {isLoggedIn && !showSwitchForm ? (
          <button
            type="button"
            onClick={() => setShowSwitchForm(true)}
            className="mt-4 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-black/20 text-sm font-semibold text-neutral-200 transition-colors hover:border-white/25 hover:text-white"
          >
            Chuyển sang tài khoản khác <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : (
        <form
          onSubmit={(e) => handleFormSubmit(e, false)}
          className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4"
        >
          <p className="text-sm font-semibold text-neutral-200">
            {isLoggedIn ? 'Chuyển sang tài khoản khác' : 'Đăng nhập hoặc đăng ký tài khoản'}
          </p>

          <div>
            <label htmlFor="modal-couple-name" className="block text-xs font-medium text-neutral-300">
              Tên tài khoản hoặc email
            </label>
            <input
              id="modal-couple-name"
              type="text"
              autoComplete="username"
              value={coupleName}
              onChange={(e) => setCoupleName(e.target.value)}
              placeholder="vd: minh-va-lan"
              className="mt-1 min-h-11 w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 text-sm text-white outline-none transition-colors placeholder:text-neutral-400 focus:border-rose-400 focus:ring-1 focus:ring-rose-400/30"
            />
          </div>

          <div>
            <label htmlFor="modal-couple-pin" className="block text-xs font-medium text-neutral-300">
              Mã PIN (4–8 chữ số)
            </label>
            <div className="relative mt-1">
              <input
                id="modal-couple-pin"
                type="password"
                autoComplete="current-password"
                value={pin}
                inputMode="numeric"
                maxLength={8}
                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Nhập mã PIN"
                className="min-h-11 w-full rounded-xl border border-white/12 bg-white/[0.04] pl-3 pr-8 text-sm text-white outline-none transition-colors placeholder:text-neutral-400 focus:border-rose-400 focus:ring-1 focus:ring-rose-400/30"
              />
              <KeyRound className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-neutral-400" />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 min-h-11 rounded-xl bg-gradient-to-r from-rose-400 to-rose-300 px-3 text-sm font-bold text-[#200912] transition-[filter] hover:brightness-105 disabled:opacity-50"
            >
              {busy ? 'Đang xử lý…' : 'Đăng nhập'}
            </button>
            <button
              type="button"
              onClick={(e) => handleFormSubmit(e, true)}
              disabled={busy}
              className="min-h-11 rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-semibold text-neutral-200 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              Tạo tài khoản mới
            </button>
          </div>
        </form>
        )}

        <p className="mt-3.5 text-center text-xs text-neutral-400">
          Lá đã mở được lưu tự động sau mỗi lượt.
        </p>
      </motion.div>

      {confirmLogout && (
        <ConfirmDialog
          icon={<LogOut className="h-5 w-5" />}
          title="Đăng xuất và bỏ ván này?"
          description="Ván đang chơi sẽ dừng và không lưu lại. Lá đã mở vẫn được giữ trong tài khoản."
          confirmLabel="Đăng xuất"
          cancelLabel="Chơi tiếp"
          onCancel={() => setConfirmLogout(false)}
          onConfirm={() => void handleLogout()}
        />
      )}
    </div>
  );
};
