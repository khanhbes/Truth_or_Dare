import React, { useId, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, Check, Lock, X } from 'lucide-react';
import type { GarmentSlot, OutfitState } from '../types';
import {
  GARMENT_LABELS,
  getPresentGarmentSlots,
  getRemovableGarmentSlots,
  swapGarments,
} from '../utils/wardrobe';
import { OutfitFigure } from './OutfitFigure';
import { useDialogFocus } from './useDialogFocus';

interface GarmentSwapDialogProps {
  playerNames: [string, string];
  outfitStates: [OutfitState, OutfitState];
  onConfirm: (firstSlot: GarmentSlot, secondSlot: GarmentSlot) => void;
  onCancel: () => void;
}

export const GarmentSwapDialog: React.FC<GarmentSwapDialogProps> = ({
  playerNames,
  outfitStates,
  onConfirm,
  onCancel,
}) => {
  const [selected, setSelected] = useState<[GarmentSlot | null, GarmentSlot | null]>([null, null]);
  const [mobileStep, setMobileStep] = useState<0 | 1>(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useDialogFocus<HTMLDivElement>({ onEscape: onCancel, initialFocusRef: closeRef });
  const titleId = useId();
  const descriptionId = useId();

  const eligible = useMemo(() => [
    getRemovableGarmentSlots(outfitStates[0]),
    getRemovableGarmentSlots(outfitStates[1]),
  ] as const, [outfitStates]);
  const preview = selected[0] && selected[1]
    ? swapGarments(outfitStates, selected[0], selected[1])
    : null;

  const selectSlot = (index: 0 | 1, slot: GarmentSlot) => {
    const nextValue = selected[index] === slot ? null : slot;
    setSelected((current) => {
      const next: [GarmentSlot | null, GarmentSlot | null] = [current[0], current[1]];
      next[index] = nextValue;
      return next;
    });
    if (index === 0 && nextValue) setMobileStep(1);
  };

  return (
    <div className="garment-dialog garment-swap" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} tabIndex={-1} className="garment-dialog__panel garment-swap__panel">
        <header className="garment-dialog__header">
          <div>
            <span className="garment-dialog__source">Lá đổi trang phục</span>
            <h2 id={titleId}>Chọn 2 món để đổi</h2>
            <p id={descriptionId}>Mỗi người chọn một món đang tháo được. Trang phục chỉ thay đổi sau khi xác nhận.</p>
          </div>
          <button ref={closeRef} type="button" onClick={onCancel} className="garment-dialog__close" aria-label="Đóng và giữ nguyên trang phục"><X aria-hidden="true" /></button>
        </header>

        <div className="garment-swap__steps" aria-label="Các bước chọn đồ trên màn hình nhỏ">
          {([0, 1] as const).map((index) => (
            <button
              key={index}
              type="button"
              aria-pressed={mobileStep === index}
              onClick={() => setMobileStep(index)}
              className={mobileStep === index ? 'is-active' : ''}
            >
              <span>{index + 1}</span> {playerNames[index]}
              {selected[index] && <Check aria-hidden="true" />}
            </button>
          ))}
        </div>

        <div className="garment-swap__grid">
          {([0, 1] as const).map((index) => {
            const displayState = preview?.outfits[index] ?? outfitStates[index];
            return (
              <section
                key={index}
                className="garment-swap__person"
                data-mobile-visible={preview || mobileStep === index ? 'true' : 'false'}
                aria-label={`Trang phục của ${playerNames[index]}`}
              >
                <div className="garment-swap__figure">
                  <OutfitFigure
                    outfit={displayState.initial}
                    state={displayState}
                    interactiveSlots={preview ? [] : [...eligible[index]]}
                    selectedSlot={selected[index]}
                    onSelectSlot={(slot) => selectSlot(index, slot)}
                    name={playerNames[index]}
                    active
                  />
                </div>
                <div className="garment-swap__choices">
                  {getPresentGarmentSlots(outfitStates[index]).map((slot) => {
                    const canSelect = eligible[index].includes(slot);
                    const isSelected = selected[index] === slot;
                    return (
                      <button key={slot} type="button" disabled={!canSelect} aria-pressed={canSelect ? isSelected : undefined} onClick={() => selectSlot(index, slot)} className={`garment-choice ${isSelected ? 'is-selected' : ''}`}>
                        <span><strong>{GARMENT_LABELS[slot]}</strong><small>{canSelect ? 'Có thể đổi' : slot === 'bra' ? 'Cần bỏ áo trước' : 'Cần bỏ quần trước'}</small></span>
                        {canSelect ? (isSelected ? <Check aria-hidden="true" /> : <span className="garment-choice__dot" />) : <Lock aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <div className="garment-swap__summary" aria-live="polite">
          <ArrowLeftRight aria-hidden="true" />
          {preview ? (
            <div>
              <strong>{GARMENT_LABELS[selected[0]!]} của {playerNames[0]} ↔ {GARMENT_LABELS[selected[1]!]} của {playerNames[1]}</strong>
              {(preview.replaced[0] || preview.replaced[1]) && (
                <p>
                  Món cùng loại đang mặc sẽ bị thay: {[
                    preview.replaced[0] ? `${GARMENT_LABELS[preview.replaced[0].slot]} của ${playerNames[0]}` : null,
                    preview.replaced[1] ? `${GARMENT_LABELS[preview.replaced[1].slot]} của ${playerNames[1]}` : null,
                  ].filter(Boolean).join(', ')}.
                </p>
              )}
            </div>
          ) : <span>Chọn đủ một món của mỗi người để xem trước.</span>}
        </div>

        <footer className="garment-dialog__footer">
          <button type="button" onClick={onCancel} className="garment-dialog__secondary">Hủy, giữ nguyên</button>
          <button type="button" disabled={!selected[0] || !selected[1]} className="garment-dialog__confirm" onClick={() => selected[0] && selected[1] && onConfirm(selected[0], selected[1])}>
            Xác nhận đổi 2 món
          </button>
        </footer>
      </div>
    </div>
  );
};
