import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, ShieldCheck, X } from 'lucide-react';
import { checkAdminSession, goToAdmin } from '../utils/adminSession';
import { useDialogFocus } from './useDialogFocus';

/**
 * Small "admin mode" switch for the player screens. Signed-in admins go
 * straight to the dashboard; everyone else first sees what will happen and
 * is then sent to the admin login (Cloudflare Access).
 */
export const AdminModeButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const continueRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useDialogFocus<HTMLDivElement>({
    onEscape: () => setShowInfo(false),
    initialFocusRef: continueRef,
    enabled: showInfo,
  });

  useEffect(() => {
    let active = true;
    void checkAdminSession().then((session) => {
      if (active) setLoggedIn(session.loggedIn);
    });
    return () => { active = false; };
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => (loggedIn ? goToAdmin() : setShowInfo(true))}
        className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/10 px-4 text-xs font-semibold text-neutral-300 transition-colors hover:border-amber-200/40 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 ${className}`}
      >
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
        {loggedIn ? 'Chuyển sang trang Admin' : 'Chế độ Admin'}
      </button>

      {showInfo && createPortal(
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setShowInfo(false); }}
        >
          <div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-login-title"
            className="relative w-full max-w-sm rounded-2xl border border-amber-200/20 bg-[#150d12] p-5 text-left text-white shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setShowInfo(false)}
              aria-label="Đóng"
              className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full text-neutral-400 hover:bg-white/[0.06] hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="grid h-11 w-11 place-items-center rounded-full bg-amber-200/10 text-amber-200">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 id="admin-login-title" className="mt-3 font-serif-romantic text-xl font-bold text-neutral-50">Đăng nhập Admin</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-300">
              Trang quản trị dùng để sửa thẻ bài và cập nhật game. Bạn sẽ được chuyển sang trang đăng nhập bảo mật của Cloudflare. Đăng nhập bằng tài khoản admin, xong sẽ quay lại thẳng trang quản trị.
            </p>
            <p className="mt-2 text-xs text-neutral-400">Chỉ email đã được cấp quyền admin mới vào được.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowInfo(false)}
                className="min-h-11 rounded-xl border border-white/12 text-sm font-semibold text-neutral-200 hover:border-white/25"
              >
                Hủy
              </button>
              <button
                ref={continueRef}
                type="button"
                onClick={goToAdmin}
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[linear-gradient(135deg,#f7e7b0,#cda95c)] text-sm font-bold text-[#1a1008]"
              >
                Tiếp tục <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};
