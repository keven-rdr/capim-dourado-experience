import { useRef, useState } from 'react';

export interface FloatingCapiPosition {
  /** Posição relativa à área disponível, entre 0 e 1. */
  x: number;
  y: number;
}

export interface FloatingCapiProps {
  label: string;
  imageSrc: string;
  onActivate: () => void;
  initialPosition?: FloatingCapiPosition;
  onMove?: (position: FloatingCapiPosition) => void;
}

/** Bolinha flutuante arrastável; o toque e a ação são definidos pela tela. */
export function FloatingCapi({
  label,
  imageSrc,
  onActivate,
  initialPosition,
  onMove,
}: FloatingCapiProps) {
  const [position, setPosition] = useState<FloatingCapiPosition | null>(
    initialPosition ? { ...initialPosition, x: initialPosition.x < 0.5 ? 0 : 1 } : null,
  );
  const [dragging, setDragging] = useState(false);
  const latest = useRef<FloatingCapiPosition | null>(null);
  const pointer = useRef<{
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+1rem)] bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-[60]">
      <button
        type="button"
        aria-label={label}
        className={`pointer-events-auto absolute grid size-14 touch-none place-items-center overflow-hidden rounded-full border-2 border-ink bg-surface/70 shadow-hard-sm backdrop-blur-sm focus-ring hover:opacity-100 focus-visible:opacity-100 motion-reduce:transition-none ${dragging ? 'opacity-100' : 'opacity-60 transition-[opacity,left,top] duration-200'}`}
        style={
          position
            ? {
                left: `calc((100% - 56px) * ${position.x})`,
                top: `calc((100% - 56px) * ${position.y})`,
              }
            : { right: 12, bottom: 0 }
        }
        onPointerDown={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragging(true);
          pointer.current = {
            startX: event.clientX,
            startY: event.clientY,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
            moved: false,
          };
          latest.current = null;
          suppressClick.current = false;
        }}
        onPointerMove={(event) => {
          const state = pointer.current;
          const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
          if (!state || !bounds) return;
          if (
            !state.moved &&
            Math.hypot(event.clientX - state.startX, event.clientY - state.startY) < 6
          )
            return;
          state.moved = true;
          const maxX = Math.max(0, bounds.width - 56);
          const maxY = Math.max(0, bounds.height - 56);
          const next = {
            x: maxX
              ? Math.max(0, Math.min(maxX, event.clientX - bounds.left - state.offsetX)) / maxX
              : 0,
            y: maxY
              ? Math.max(0, Math.min(maxY, event.clientY - bounds.top - state.offsetY)) / maxY
              : 0,
          };
          latest.current = next;
          setPosition(next);
        }}
        onPointerUp={() => {
          if (pointer.current?.moved) {
            suppressClick.current = true;
            if (latest.current) {
              const snapped = { ...latest.current, x: latest.current.x < 0.5 ? 0 : 1 };
              setPosition(snapped);
              onMove?.(snapped);
            }
          }
          pointer.current = null;
          setDragging(false);
        }}
        onPointerCancel={() => {
          pointer.current = null;
          setDragging(false);
          suppressClick.current = true;
        }}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          onActivate();
        }}
      >
        <img
          src={imageSrc}
          alt=""
          draggable={false}
          className="size-full rounded-full object-cover"
        />
      </button>
    </div>
  );
}
