import React, { useId, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { BookHeart, Clock, Heart, Layers, Shirt, Sparkles, Trash2, X } from 'lucide-react';
import type { JournalEntry } from '../utils/gameJournal';
import { dialogPanelMotion } from '../utils/motionTokens';
import { ConfirmDialog } from './ConfirmDialog';
import { useDialogFocus } from './useDialogFocus';
import { FOCUS_RING } from './game/tableStyles';

interface JournalModalProps {
  entries: readonly JournalEntry[];
  onDelete: (id: string) => void;
  onClose: () => void;
}

const formatDay = (time: number): string =>
  new Date(time).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' });

const formatHour = (time: number): string =>
  new Date(time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

const Entry: React.FC<{ entry: JournalEntry; onDelete: () => void }> = ({ entry, onDelete }) => {
  const [first, second] = entry.players;
  const facts = [
    entry.minutes !== null ? { icon: Clock, text: `${entry.minutes} phút` } : null,
    { icon: Heart, text: `Tim Hồng ${entry.intimacyPercent}%` },
    entry.luxuryPercent > 0 ? { icon: Sparkles, text: `Luxury ${entry.luxuryPercent}%` } : null,
    { icon: Layers, text: `${entry.cardsCompleted + entry.positionsCompleted} lá` },
    entry.garmentsRemoved > 0 ? { icon: Shirt, text: `${entry.garmentsRemoved} món` } : null,
  ].filter((fact) => fact !== null);
  return (
    <li className="rounded-2xl border border-white/12 bg-white/[0.035] p-4 text-left">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-100 first-letter:uppercase">{formatDay(entry.finishedAt)}</p>
          <p className="truncate text-sm text-neutral-200">
            {formatHour(entry.finishedAt)} · {first.avatar} {first.name} & {second.avatar} {second.name}
          </p>
        </div>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Xóa trang nhật ký ${formatDay(entry.finishedAt)}`}
          className={`-mr-1 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full text-neutral-300 transition-colors hover:bg-rose-500/15 hover:text-rose-100 ${FOCUS_RING}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {facts.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1 text-xs tabular-nums text-neutral-100">
            <Icon className="h-3.5 w-3.5 text-rose-200" aria-hidden="true" /> {text}
          </li>
        ))}
      </ul>
      {entry.players.map((player, index) => entry.moments[index] && (
        <p key={`moment-${index}`} className="mt-3 text-sm leading-relaxed text-neutral-100">
          <span className="font-semibold text-rose-100">{player.name} thích nhất:</span> {entry.moments[index]}
        </p>
      ))}
      {entry.players.map((player, index) => entry.notes[index] && (
        <blockquote key={`note-${index}`} className="mt-3 border-l-2 border-amber-200/50 pl-3">
          <p className="whitespace-pre-line text-sm italic leading-relaxed text-neutral-50">“{entry.notes[index]}”</p>
          <footer className="mt-0.5 text-xs text-neutral-300">{player.name} nhắn {entry.players[index === 0 ? 1 : 0].name}</footer>
        </blockquote>
      ))}
    </li>
  );
};

/** The evenings the couple kept. Only on this device. */
export const JournalModal: React.FC<JournalModalProps> = ({ entries, onDelete, onClose }) => {
  const reduceMotion = Boolean(useReducedMotion());
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useDialogFocus<HTMLDivElement>({ onEscape: onClose, initialFocusRef: closeRef });
  const [deleting, setDeleting] = useState<string | null>(null);
  const titleId = useId();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-3 backdrop-blur-md sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        {...dialogPanelMotion(reduceMotion)}
        className="flex max-h-[calc(100svh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-rose-400/25 bg-[#140c10] text-white shadow-[0_28px_90px_rgba(0,0,0,.72)]"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-rose-500/15 text-rose-100" aria-hidden="true"><BookHeart className="h-5 w-5" /></span>
            <div className="min-w-0">
              <h2 id={titleId} className="font-serif-romantic text-2xl font-bold">Nhật ký của hai bạn</h2>
              <p className="text-sm text-neutral-300">Chỉ nằm trên máy này</p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng nhật ký"
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-neutral-200 transition-colors hover:border-white/30 hover:text-white ${FOCUS_RING}`}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
          {entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-200">Chưa có trang nào. Cuối ván, hai bạn có thể lưu lại một khoảnh khắc.</p>
          ) : (
            <ul className="space-y-3">
              {entries.map((entry) => <Entry key={entry.id} entry={entry} onDelete={() => setDeleting(entry.id)} />)}
            </ul>
          )}
        </div>
      </motion.div>
      {deleting && (
        <ConfirmDialog
          icon={<Trash2 className="h-5 w-5" />}
          title="Xóa trang này?"
          description="Khoảnh khắc và lời nhắn của ván đó sẽ mất hẳn."
          confirmLabel="Xóa"
          cancelLabel="Giữ lại"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            onDelete(deleting);
            setDeleting(null);
          }}
        />
      )}
    </motion.div>
  );
};
