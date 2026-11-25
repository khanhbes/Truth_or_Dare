import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertCircle, Check, Lock, X } from 'lucide-react';
import type { GarmentSlot, OutfitState } from '../types';
import { GARMENT_LABELS, getPresentGarmentSlots, getRemovableGarmentSlots } from '../utils/wardrobe';
import { OutfitFigure } from './OutfitFigure';
import { useDialogFocus } from './useDialogFocus';

export interface GarmentRemovalDialogProps {
  open?: boolean;
  targetName: string;
  outfitState: OutfitState;
  source: 'card' | 'penalty' | 'preparation';
  onConfirm: (slot: GarmentSlot) => void;
  onCancel: () => void;
  onContinueWithoutRemoval?: () => void;
}

export const GarmentRemovalDialog: React.FC<GarmentRemovalDialogProps> = ({
  open = true,
  targetName,
  outfitState,
  source,
  onConfirm,
  onCancel,
  onContinueWithoutRemoval,
}) => {
  const [selectedSlot, setSelectedSlot] = useState<GarmentSlot | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useDialogFocus<HTMLDivElement>({ onEscape: onCancel, initialFocusRef: closeButtonRef, enabled: open });
  const titleId = useId();
  const descriptionId = useId();
  const eligibleSlots = useMemo(() => getRemovableGarmentSlots(outfitState), [outfitState]);
  const presentSlots = useMemo(() => getPresentGarmentSlots(outfitState), [outfitState]);

  useEffect(() => {
    if (open) setSelectedSlot(null);
  }, [open, targetName]);

  useEffect(() => {
    if (selectedSlot && !eligibleSlots.includes(selectedSlot)) setSelectedSlot(null);
  }, [eligibleSlots, selectedSlot]);

  if (!open) return null;
  const hasEligibleGarment = eligibleSlots.length > 0;
  const sourceLabel = source === 'card' ? 'Theo lá bài' : source === 'penalty' ? 'Bỏ lá' : 'Chuẩn bị Bộ Tư thế';

  return (
    <div className="garment-dialog" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="garment-dialog__panel"
      >
        <header className="garment-dialog__header">
          <div>
            <span className="garment-dialog__source">{sourceLabel}</span>
            <h2 id={titleId}>Chọn 1 món của {targetName}</h2>
            <p id={descriptionId}>
              {hasEligibleGarment
                ? 'Chọn trên nhân vật hoặc trong danh sách. Món đồ chỉ bỏ sau khi xác nhận.'
                : `${targetName} không còn món đồ nào có thể bỏ ở thời điểm này.`}
            </p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onCancel} className="garment-dialog__close" aria-label="Đóng và giữ nguyên trang phục">
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="garment-dialog__content">
          <div className="garment-dialog__figure">
            <OutfitFigure
              outfit={outfitState.initial}
              state={outfitState}
              interactiveSlots={eligibleSlots}
              selectedSlot={selectedSlot}
              previewRemovedSlot={selectedSlot}
              onSelectSlot={(slot) => setSelectedSlot((current) => current === slot ? null : slot)}
              name={targetName}
              active
            />
            <p className="garment-dialog__preview-note" aria-live="polite">
              {selectedSlot ? `Đang xem trước: bỏ ${GARMENT_LABELS[selectedSlot].toLocaleLowerCase('vi')}.` : 'Chưa chọn món đồ.'}
            </p>
          </div>

          <div className="garment-dialog__choices">
            {presentSlots.map((slot) => {
              const isEligible = eligibleSlots.includes(slot);
              const isSelected = selectedSlot === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={!isEligible}
                  aria-pressed={isEligible ? isSelected : undefined}
                  onClick={() => setSelectedSlot(isSelected ? null : slot)}
                  className={`garment-choice ${isSelected ? 'is-selected' : ''}`}
                >
                  <span>
                    <strong>{GARMENT_LABELS[slot]}</strong>
                    <small>{isEligible ? 'Có thể chọn' : slot === 'bra' ? 'Cần bỏ áo trước' : 'Cần bỏ quần trước'}</small>
                  </span>
                  {isEligible ? (isSelected ? <Check aria-hidden="true" /> : <span className="garment-choice__dot" />) : <Lock aria-hidden="true" />}
                </button>
              );
            })}

            {!hasEligibleGarment && (
              <div className="garment-dialog__empty" role="status">
                <AlertCircle aria-hidden="true" />
                <p>Hãy cùng chọn một phương án thay thế mà cả hai đều thoải mái. Trò chơi vẫn có thể tiếp tục.</p>
              </div>
            )}
          </div>
        </div>

        <footer className="garment-dialog__footer">
          <button type="button" onClick={onCancel} className="garment-dialog__secondary">Hủy, giữ nguyên</button>
          {hasEligibleGarment ? (
            <button
              type="button"
              disabled={!selectedSlot}
              className="garment-dialog__confirm"
              onClick={() => selectedSlot && onConfirm(selectedSlot)}
            >
              {selectedSlot ? `Xác nhận bỏ ${GARMENT_LABELS[selectedSlot].toLocaleLowerCase('vi')}` : 'Chọn một món để xác nhận'}
            </button>
          ) : (
            <button type="button" className="garment-dialog__confirm" onClick={onContinueWithoutRemoval ?? onCancel}>Tiếp tục ván chơi</button>
          )}
        </footer>
      </div>
    </div>
  );
};
