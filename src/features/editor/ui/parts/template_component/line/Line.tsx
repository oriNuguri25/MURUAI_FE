import {
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { Point } from "../../../../model/canvasTypes";
import { normalizePoint } from "../../../../utils/domUtils";
import { useLineInteraction } from "./useLineInteraction";

interface LineShapeProps {
  id: string;
  start: Point;
  end: Point;
  stroke: { color: string; width: number };
  isSelected?: boolean;
  locked?: boolean;
  onLineChange?: (value: { start: Point; end: Point }) => void;
  onDragStateChange?: (
    isDragging: boolean,
    value?: { start: Point; end: Point },
    context?: { type: "drag" | "resize" }
  ) => void;
  onSelectChange?: (isSelected: boolean, options?: { additive?: boolean }) => void;
  onContextMenu?: (event: ReactMouseEvent<HTMLDivElement>) => void;
}

const Line = ({
  start,
  end,
  stroke,
  isSelected = false,
  locked = false,
  onLineChange,
  onDragStateChange,
  onSelectChange,
  onContextMenu,
}: LineShapeProps) => {
  const safeStart = normalizePoint(start);
  const safeEnd = normalizePoint(end);
  const lineRef = useRef({ start: safeStart, end: safeEnd });
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    lineRef.current = { start: safeStart, end: safeEnd };
  }, [safeStart, safeEnd]);

  const handleSize = 10;
  const halfHandle = handleSize / 2;
  const padding = Math.max(6, stroke.width, handleSize);
  const getBounds = (line: { start: Point; end: Point }) => {
    const minX = Math.min(line.start.x, line.end.x);
    const minY = Math.min(line.start.y, line.end.y);
    const width = Math.max(Math.abs(line.end.x - line.start.x), 1);
    const height = Math.max(Math.abs(line.end.y - line.start.y), 1);
    return {
      boxX: minX - padding,
      boxY: minY - padding,
      boxWidth: width + padding * 2,
      boxHeight: height + padding * 2,
    };
  };

  const { boxX, boxY, boxWidth, boxHeight } = getBounds({
    start: safeStart,
    end: safeEnd,
  });
  const startRel = { x: safeStart.x - boxX, y: safeStart.y - boxY };
  const endRel = { x: safeEnd.x - boxX, y: safeEnd.y - boxY };

  const getPointerPosition = (event: PointerEvent, scale: number) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const bounds = getBounds(lineRef.current);
    return {
      x: (event.clientX - rect.left) / scale + bounds.boxX,
      y: (event.clientY - rect.top) / scale + bounds.boxY,
    };
  };

  const { startDrag, startResize } = useLineInteraction({
    wrapperRef,
    lineRef,
    locked,
    isSelected,
    onLineChange,
    onDragStateChange,
    onSelectChange,
    getPointerPosition,
  });

  const showOutline = !locked && isSelected;

  return (
    <div
      ref={wrapperRef}
      className="absolute"
      style={{
        left: boxX,
        top: boxY,
        width: boxWidth,
        height: boxHeight,
      }}
      onContextMenu={onContextMenu}
    >
      {showOutline && (
        <div className="absolute inset-0 rounded border border-primary/60 pointer-events-none" />
      )}
      <svg width={boxWidth} height={boxHeight} className="absolute inset-0">
        <line
          x1={startRel.x}
          y1={startRel.y}
          x2={endRel.x}
          y2={endRel.y}
          stroke="transparent"
          strokeWidth={Math.max(12, stroke.width + 6)}
          pointerEvents="stroke"
          onPointerDown={startDrag}
        />
        <line
          x1={startRel.x}
          y1={startRel.y}
          x2={endRel.x}
          y2={endRel.y}
          stroke={stroke.color}
          strokeWidth={stroke.width}
          strokeLinecap="round"
          pointerEvents="none"
        />
      </svg>
      {!locked && isSelected && (
        <>
          <div
            className="absolute rounded-full border border-primary bg-white-100"
            style={{
              width: handleSize,
              height: handleSize,
              left: startRel.x - halfHandle,
              top: startRel.y - halfHandle,
              cursor: "grab",
            }}
            onPointerDown={(event) => { startResize(event, "start"); }}
          />
          <div
            className="absolute rounded-full border border-primary bg-white-100"
            style={{
              width: handleSize,
              height: handleSize,
              left: endRel.x - halfHandle,
              top: endRel.y - halfHandle,
              cursor: "grab",
            }}
            onPointerDown={(event) => { startResize(event, "end"); }}
          />
        </>
      )}
    </div>
  );
};

export default Line;
