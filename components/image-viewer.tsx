"use client";

/* eslint-disable @next/next/no-img-element */

import type {
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from "react";
import { useEffect, useRef, useState } from "react";
import { Download, Minus, Plus, RotateCcw, X } from "lucide-react";

type Point = { x: number; y: number };

type ImageViewerProps = {
  imageUrl: string;
  open: boolean;
  onClose: () => void;
  onDownload: () => void;
  downloading: boolean;
};

function clampScale(value: number) {
  return Math.min(4, Math.max(1, value));
}

function pointDistance([first, second]: Point[]) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function ImageViewer({
  imageUrl,
  open,
  onClose,
  onDownload,
  downloading,
}: ImageViewerProps) {
  if (!open) return null;

  return (
    <OpenImageViewer
      imageUrl={imageUrl}
      onClose={onClose}
      onDownload={onDownload}
      downloading={downloading}
    />
  );
}

function OpenImageViewer({
  imageUrl,
  onClose,
  onDownload,
  downloading,
}: Omit<ImageViewerProps, "open">) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const pointersRef = useRef(new Map<number, Point>());
  const pinchDistanceRef = useRef<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  function applyScale(nextScale: number) {
    const clamped = clampScale(nextScale);
    setScale(clamped);
    if (clamped === 1) setOffset({ x: 0, y: 0 });
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    applyScale(scale + (event.deltaY < 0 ? 0.25 : -0.25));
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointersRef.current.size === 2) {
      pinchDistanceRef.current = pointDistance([
        ...pointersRef.current.values(),
      ]);
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const previous = pointersRef.current.get(event.pointerId);
    if (!previous) return;

    const current = { x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, current);

    if (pointersRef.current.size === 1 && scale > 1) {
      setOffset((value) => ({
        x: value.x + current.x - previous.x,
        y: value.y + current.y - previous.y,
      }));
      return;
    }

    if (pointersRef.current.size === 2) {
      const distance = pointDistance([...pointersRef.current.values()]);
      const previousDistance = pinchDistanceRef.current;
      if (previousDistance && previousDistance > 0) {
        applyScale(scale * (distance / previousDistance));
      }
      pinchDistanceRef.current = distance;
    }
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchDistanceRef.current = null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="查看效果图细节"
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 text-white"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-[13px] font-medium">效果图细节</p>
          <p className="mt-0.5 text-[10px] text-white/55">
            双指或滚轮缩放，放大后拖动查看
          </p>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="关闭图片查看器"
          onClick={onClose}
          className="grid size-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <div
        className={`relative flex min-h-0 flex-1 select-none items-center justify-center overflow-hidden touch-none ${
          scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
        }`}
        onDoubleClick={() => applyScale(scale === 1 ? 2 : 1)}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <img
          src={imageUrl}
          alt="效果图细节"
          draggable={false}
          className="max-h-full max-w-full object-contain will-change-transform"
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
          }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 bg-black/70 px-4 py-4 backdrop-blur-md">
        <button
          type="button"
          aria-label="缩小"
          onClick={() => applyScale(scale - 0.25)}
          disabled={scale <= 1}
          className="grid size-11 place-items-center rounded-full bg-white/10 disabled:opacity-35"
        >
          <Minus size={18} aria-hidden="true" />
        </button>
        <output
          data-testid="zoom-value"
          aria-live="polite"
          className="min-w-16 text-center text-[12px] tabular-nums text-white/80"
        >
          {Math.round(scale * 100)}%
        </output>
        <button
          type="button"
          aria-label="放大"
          onClick={() => applyScale(scale + 0.25)}
          disabled={scale >= 4}
          className="grid size-11 place-items-center rounded-full bg-white/10 disabled:opacity-35"
        >
          <Plus size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="复位"
          onClick={() => {
            setScale(1);
            setOffset({ x: 0, y: 0 });
          }}
          className="grid size-11 place-items-center rounded-full bg-white/10"
        >
          <RotateCcw size={17} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onDownload}
          disabled={downloading}
          className="flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-[12px] font-semibold text-stone-900 disabled:opacity-60"
        >
          <Download size={16} aria-hidden="true" />
          {downloading ? "下载中" : "下载高清图"}
        </button>
      </div>
    </div>
  );
}
