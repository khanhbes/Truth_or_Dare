import React, { useId, useMemo, useState } from 'react';
import { Check, Lock, X } from 'lucide-react';
import type { GarmentSlot, OutfitState } from '../types';
import { GARMENT_LABELS, getPresentGarmentSlots, getRemovableGarmentSlots } from '../utils/wardrobe';
import { OutfitFigure } from './OutfitFigure';
import { useDialogFocus } from './useDialogFocus';

interface DualGarmentRemovalDialogProps {
  playerNames: readonly [string, string];
  outfitStates: readonly [OutfitState, OutfitState];
  onConfirm: (firstSlot: GarmentSlot, secondSlot: GarmentSlot) => void;
  onCancel: () => void;
  onContinueWithoutRemoval: () => void;
}

export const DualGarmentRemovalDialog: React.FC<DualGarmentRemovalDialogProps> = ({
  playerNames,
  outfitStates,
  onConfirm,
  onCancel,
  onContinueWithoutRemoval,
}) => {
  const [selections, setSelections] = useState<[GarmentSlot | null, GarmentSlot | null]>([null, null]);
  const panelRef = useDialogFocus<HTMLDivElement>({ onEscape: onCancel });
  const titleId = useId();
  const descriptionId = useId();
  const eligible = [
    getRemovableGarmentSlots(outfitStates[0]),
    getRemovableGarmentSlots(outfitStates[1]),
  ] as const;
  const canComplete = eligible[0].length > 0 && eligible[1].length > 0;
  const names = useMemo(() => [...playerNames] as [string, string], [playerNames]);

  const choose = (index: 0 | 1, slot: GarmentSlot) => {
    setSelections((current) => {
      const next: [GarmentSlot | null, GarmentSlot | null] = [current[0], current[1]];
      next[index] = current[index] === slot ? null : slot;
      return next;
    });
  };

  return (
    <div className="garment-dialog" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="garment-dialog__panel garment-swap__panel">
        <header className="garment-dialog__header">
          <div>
            <span className="garment-dialog__source">Theo lá bài · cả hai</span>
            <h2 id={titleId}>Mỗi người chọn 1 món để bỏ</h2>
            <p id={descriptionId}>Hai món chỉ bỏ cùng lúc, sau khi xác nhận. Hủy thì cả hai giữ nguyên.</p>
          </div>
          <button type="button" onClick={onCancel} className="garment-dialog__close" aria-label="Hủy và giữ nguyên trang phục"><X aria-hidden="true" /></button>
        </header>

        <div className="garment-swap__grid">
          {([0, 1] as const).map((index) => {
            const present = getPresentGarmentSlots(outfitStates[index]);
            return (
              <section key={index} className="garment-swap__person" aria-label={`Chọn đồ của ${names[index]}`}>
                <div className="garment-swap__figure">
                  <OutfitFigure
                    outfit={outfitStates[index].initial}
                    state={outfitStates[index]}
                    interactiveSlots={eligible[index]}
                    selectedSlot={selections[index]}
                    previewRemovedSlot={selections[index]}
                    onSelectSlot={(slot) => choose(index, slot)}
                    name={names[index]}
                    active
                  />
                </div>
                <div className="garment-swap__choices">
                  {present.length === 0 && <p className="text-sm text-neutral-200">Không còn món nào để bỏ.</p>}
                  {present.map((slot) => {
                    const allowed = eligible[index].includes(slot);
                    const selected = selections[index] === slot;
                    return (
                      <button key={slot} type="button" disabled={!allowed} aria-pressed={allowed ? selected : undefined} onClick={() => choose(index, slot)} className={`garment-choice ${selected ? 'is-selected' : ''}`}>
                        <span><strong>{GARMENT_LABELS[slot]}</strong><small>{allowed ? 'Có thể chọn' : slot === 'bra' ? 'Cần bỏ áo trước' : 'Cần bỏ quần trước'}</small></span>
                        {allowed ? (selected ? <Check aria-hidden="true" /> : <span className="garment-choice__dot" />) : <Lock aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <footer className="garment-dialog__footer">
          <button type="button" onClick={onCancel} className="garment-dialog__secondary">Hủy, giữ nguyên</button>
          {canComplete ? (
            <button type="button" className="garment-dialog__confirm" disabled={!selections[0] || !selections[1]} onClick={() => selections[0] && selections[1] && onConfirm(selections[0], selections[1])}>
              {selections[0] && selections[1] ? 'Xác nhận bỏ 2 món' : 'Chọn một món của mỗi người'}
            </button>
          ) : (
            <button type="button" className="garment-dialog__confirm" onClick={onContinueWithoutRemoval}>Tiếp tục không bỏ đồ</button>
          )}
        </footer>
      </div>
    </div>
  );
};
