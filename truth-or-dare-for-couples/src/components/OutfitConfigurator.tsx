import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Minus, Plus, Shirt } from 'lucide-react';
import type { GarmentConfig, GarmentSlot, OutfitConfig, PlayerPresentation } from '../types';
import { GARMENT_COLORS, GARMENT_LABELS, getGarmentStyles } from '../utils/wardrobe';
import { OutfitFigure } from './OutfitFigure';

export interface OutfitConfiguratorProps {
  value: OutfitConfig;
  onChange: (outfit: OutfitConfig) => void;
  presentation?: PlayerPresentation;
  label?: string;
  disabled?: boolean;
  className?: string;
}

const SLOT_ORDER: Record<PlayerPresentation, GarmentSlot[]> = {
  male: ['shirt', 'pants', 'underwear'],
  female: ['shirt', 'pants', 'bra', 'underwear'],
};

const FALLBACK_COLOR = '#FF6B9D';

const sameColor = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export const OutfitConfigurator: React.FC<OutfitConfiguratorProps> = ({
  value,
  onChange,
  presentation = value.presentation,
  label,
  disabled = false,
  className = '',
}) => {
  const slots = SLOT_ORDER[presentation];
  const [editingSlot, setEditingSlot] = useState<GarmentSlot>(slots[0]);
  const rememberedGarments = useRef<Partial<Record<GarmentSlot, GarmentConfig>>>({ ...value.garments });

  useEffect(() => {
    for (const slot of slots) {
      const garment = value.garments[slot];
      if (garment) rememberedGarments.current[slot] = garment;
    }
  }, [slots, value.garments]);

  useEffect(() => {
    if (!slots.includes(editingSlot)) setEditingSlot(slots[0]);
  }, [editingSlot, slots]);

  const selectedGarment = value.garments[editingSlot];
  const garmentCount = useMemo(() => slots.filter((slot) => Boolean(value.garments[slot])).length, [slots, value.garments]);
  const slotName = GARMENT_LABELS[editingSlot].toLocaleLowerCase('vi');

  const emitGarments = (garments: OutfitConfig['garments']) => {
    onChange({ presentation, garments });
  };

  const toggleGarment = (slot: GarmentSlot) => {
    if (disabled) return;
    setEditingSlot(slot);
    const garments = { ...value.garments };
    if (garments[slot]) {
      rememberedGarments.current[slot] = garments[slot];
      delete garments[slot];
    } else {
      const fallbackStyle = getGarmentStyles(presentation, slot)[0];
      garments[slot] = rememberedGarments.current[slot] ?? {
        styleId: fallbackStyle?.id ?? 'default',
        color: GARMENT_COLORS[0]?.value ?? FALLBACK_COLOR,
      };
    }
    emitGarments(garments);
  };

  const updateSelectedGarment = (patch: Partial<GarmentConfig>) => {
    if (!selectedGarment || disabled) return;
    const next = { ...selectedGarment, ...patch };
    rememberedGarments.current[editingSlot] = next;
    emitGarments({ ...value.garments, [editingSlot]: next });
  };

  const styleLabel = (slot: GarmentSlot) => {
    const garment = value.garments[slot];
    if (!garment) return 'Chưa mặc';
    return getGarmentStyles(presentation, slot).find((style) => style.id === garment.styleId)?.label ?? 'Đang mặc';
  };

  const availableStyles = getGarmentStyles(presentation, editingSlot);
  const usingCustomColor = Boolean(selectedGarment) && !GARMENT_COLORS.some((color) => sameColor(color.value, selectedGarment!.color));

  return (
    <section className={`outfit-configurator ${className}`.trim()} aria-label={label ? `Trang phục của ${label}` : `Trang phục ${presentation === 'male' ? 'nam' : 'nữ'}`}>
      <div className="outfit-configurator__workspace">
        <div className="outfit-configurator__stage">
          <OutfitFigure
            outfit={{ ...value, presentation }}
            editingSlot={editingSlot}
            selectedSlot={editingSlot}
            compact
            ariaLabel={`Xem trước trang phục của ${label ?? (presentation === 'male' ? 'Anh' : 'Em')}`}
          />
          <span className="outfit-configurator__count" aria-label={`${garmentCount} trên ${slots.length} món đang mặc`}>
            <Shirt aria-hidden="true" /> {garmentCount}/{slots.length} món
          </span>
        </div>

        <div className="outfit-configurator__slots" role="list" aria-label="Các món đồ">
          {slots.map((slot) => {
            const garment = value.garments[slot];
            const included = Boolean(garment);
            const selected = editingSlot === slot;
            return (
              <div key={slot} role="listitem" className={`outfit-slot ${selected ? 'is-editing' : ''} ${included ? 'is-included' : ''}`}>
                <button
                  type="button"
                  className="outfit-slot__select"
                  aria-pressed={selected}
                  aria-label={`Chỉnh ${GARMENT_LABELS[slot].toLocaleLowerCase('vi')}: ${styleLabel(slot)}`}
                  disabled={disabled}
                  onClick={() => setEditingSlot(slot)}
                >
                  <span
                    className="outfit-slot__swatch"
                    style={garment ? ({ '--swatch-color': garment.color } as React.CSSProperties) : undefined}
                    aria-hidden="true"
                  />
                  <span className="outfit-slot__text">
                    <span className="outfit-slot__name">{GARMENT_LABELS[slot]}</span>
                    <span className="outfit-slot__style">{styleLabel(slot)}</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="outfit-slot__toggle"
                  aria-label={`${included ? 'Bỏ' : 'Thêm'} ${GARMENT_LABELS[slot].toLocaleLowerCase('vi')}`}
                  aria-pressed={included}
                  disabled={disabled}
                  onClick={() => toggleGarment(slot)}
                >
                  {included ? <Minus aria-hidden="true" /> : <Plus aria-hidden="true" />}
                  <span>{included ? 'Bỏ ra' : 'Thêm'}</span>
                </button>
              </div>
            );
          })}
        </div>

        <div className="outfit-configurator__editor" aria-live="polite">
          <p className="outfit-configurator__editing">
            Đang chỉnh: <strong>{GARMENT_LABELS[editingSlot]}</strong>
          </p>
          {selectedGarment ? (
            <>
              <div className="outfit-configurator__field" role="group" aria-label={`Kiểu ${slotName}`}>
                <span className="outfit-configurator__field-label">Kiểu</span>
                <div className="outfit-configurator__styles">
                  {availableStyles.map((style) => {
                    const active = selectedGarment.styleId === style.id;
                    return (
                      <button
                        key={style.id}
                        type="button"
                        disabled={disabled}
                        aria-pressed={active}
                        onClick={() => updateSelectedGarment({ styleId: style.id })}
                        className={active ? 'is-selected' : ''}
                      >
                        {active && <Check aria-hidden="true" />}
                        {style.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="outfit-configurator__field" role="group" aria-label={`Màu ${slotName}`}>
                <span className="outfit-configurator__field-label">Màu</span>
                <div className="outfit-configurator__palette">
                  {GARMENT_COLORS.map((color) => {
                    const active = sameColor(selectedGarment.color, color.value);
                    return (
                      <button
                        key={color.id}
                        type="button"
                        disabled={disabled}
                        className={active ? 'is-selected' : ''}
                        style={{ '--swatch-color': color.value } as React.CSSProperties}
                        aria-label={`Màu ${color.label}`}
                        aria-pressed={active}
                        title={color.label}
                        onClick={() => updateSelectedGarment({ color: color.value })}
                      >
                        <span aria-hidden="true" />
                      </button>
                    );
                  })}
                  <label
                    className={`outfit-configurator__custom-color ${usingCustomColor ? 'is-selected' : ''}`}
                    title="Chọn màu khác"
                    style={usingCustomColor ? ({ '--swatch-color': selectedGarment.color } as React.CSSProperties) : undefined}
                  >
                    <span aria-hidden="true" />
                    <input
                      type="color"
                      disabled={disabled}
                      value={selectedGarment.color}
                      aria-label={`Chọn màu khác cho ${slotName}`}
                      onChange={(event) => updateSelectedGarment({ color: event.target.value.toUpperCase() })}
                    />
                  </label>
                </div>
              </div>
            </>
          ) : (
            <div className="outfit-configurator__empty">
              <p>{label ?? 'Nhân vật'} bắt đầu ván mà không mặc {slotName}.</p>
              <button type="button" disabled={disabled} className="outfit-configurator__add" onClick={() => toggleGarment(editingSlot)}>
                <Plus aria-hidden="true" /> Thêm {slotName}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
