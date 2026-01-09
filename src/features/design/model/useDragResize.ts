import { useRef, useCallback, type PointerEvent as ReactPointerEvent } from "react";
import type { Rect, ResizeHandle } from "./canvasTypes";
import { getScale } from "../utils/domUtils";

interface UseDragResizeOptions {
  rect: Rect;
  minWidth?: number;
  minHeight?: number;
  locked?: boolean;
  containerRef: React.RefObject<HTMLElement>;
  transformRect?: (
    rect: Rect,
    context: { type: "drag" | "resize"; handle?: ResizeHandle }
  ) => Rect;
  onRectChange?: (rect: Rect) => void;
  onDragStateChange?: (
    isDragging: boolean,
    finalRect?: Rect,
    context?: { type: "drag" | "resize" }
  ) => void;
  onSelectChange?: (isSelected: boolean, options?: { additive?: boolean }) => void;
}

interface ActiveListeners {
  moveListener: (event: PointerEvent) => void;
  upListener: () => void;
}

/**
 * 드래그 & 리사이즈 기능을 제공하는 커스텀 훅
 *
 * @example
 * const { startDrag, startResize, renderHandles } = useDragResize({
 *   rect,
 *   minWidth: 50,
 *   minHeight: 50,
 *   containerRef: boxRef,
 *   onRectChange: handleRectChange,
 * });
 */
export const useDragResize = ({
  rect,
  minWidth = 1,
  minHeight = 1,
  locked = false,
  containerRef,
  transformRect,
  onRectChange,
  onDragStateChange,
  onSelectChange,
}: UseDragResizeOptions) => {
  const rectRef = useRef(rect);
  const actionRef = useRef<ActiveListeners | null>(null);

  // rect 동기화
  rectRef.current = rect;

  // 액션 시작
  const startAction = useCallback(
    (
      event: ReactPointerEvent<HTMLElement>,
      type: "drag" | "resize",
      handle?: ResizeHandle
    ) => {
      if (locked) return;
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();

      onSelectChange?.(true, { additive: event.shiftKey });

      const scale = getScale(containerRef.current);
      const startRect = rectRef.current;
      const startX = event.clientX;
      const startY = event.clientY;

      let hasMoved = false;

      const moveListener = (moveEvent: PointerEvent) => {
        moveEvent.preventDefault();

        const dx = (moveEvent.clientX - startX) / scale;
        const dy = (moveEvent.clientY - startY) / scale;

        if (!hasMoved) {
          hasMoved = true;
          onDragStateChange?.(true, rectRef.current, { type, handle });
        }

        if (type === "drag") {
          const nextRect = transformRect
            ? transformRect(
                {
                  x: startRect.x + dx,
                  y: startRect.y + dy,
                  width: startRect.width,
                  height: startRect.height,
                },
                { type, handle }
              )
            : {
                x: startRect.x + dx,
                y: startRect.y + dy,
                width: startRect.width,
                height: startRect.height,
              };
          rectRef.current = nextRect;
          onRectChange?.(nextRect);
          return;
        }

        if (type === "resize" && handle) {
          let nextX = startRect.x;
          let nextY = startRect.y;
          let nextWidth = startRect.width;
          let nextHeight = startRect.height;

          if (handle.includes("e")) {
            nextWidth = startRect.width + dx;
          }
          if (handle.includes("s")) {
            nextHeight = startRect.height + dy;
          }
          if (handle.includes("w")) {
            nextWidth = startRect.width - dx;
            nextX = startRect.x + dx;
          }
          if (handle.includes("n")) {
            nextHeight = startRect.height - dy;
            nextY = startRect.y + dy;
          }

          if (nextWidth < minWidth) {
            nextWidth = minWidth;
            if (handle.includes("w")) {
              nextX = startRect.x + (startRect.width - minWidth);
            }
          }

          if (nextHeight < minHeight) {
            nextHeight = minHeight;
            if (handle.includes("n")) {
              nextY = startRect.y + (startRect.height - minHeight);
            }
          }

          const nextRect = transformRect
            ? transformRect(
                {
                  x: nextX,
                  y: nextY,
                  width: nextWidth,
                  height: nextHeight,
                },
                { type, handle }
              )
            : {
                x: nextX,
                y: nextY,
                width: nextWidth,
                height: nextHeight,
              };
          rectRef.current = nextRect;
          onRectChange?.(nextRect);
        }
      };

      const upListener = () => {
        window.removeEventListener("pointermove", moveListener);
        window.removeEventListener("pointerup", upListener);
        actionRef.current = null;
        if (hasMoved) {
          onDragStateChange?.(false, rectRef.current, { type, handle });
        }
      };

      actionRef.current = { moveListener, upListener };
      window.addEventListener("pointermove", moveListener);
      window.addEventListener("pointerup", upListener);
    },
    [
      locked,
      containerRef,
      transformRect,
      onRectChange,
      onDragStateChange,
      onSelectChange,
      minWidth,
      minHeight,
    ]
  );

  const startDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      startAction(event, "drag");
    },
    [startAction]
  );

  const startResize = useCallback(
    (event: ReactPointerEvent<HTMLElement>, handle: ResizeHandle) => {
      startAction(event, "resize", handle);
    },
    [startAction]
  );

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    const action = actionRef.current;
    if (!action) return;
    window.removeEventListener("pointermove", action.moveListener);
    window.removeEventListener("pointerup", action.upListener);
    actionRef.current = null;
  }, []);

  return {
    startDrag,
    startResize,
    cleanup,
  };
};
