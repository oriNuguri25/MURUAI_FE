import { useCallback, useRef, useState } from "react";

export type AlignmentGuide = {
  id: string;
  orientation: "vertical" | "horizontal";
  position: number;
  reason: "center" | "edge" | "spacing";
};

export type SmartGuideState = {
  guides: AlignmentGuide[];
  snapOffset: { x: number; y: number };
};

type Rect = { x: number; y: number; width: number; height: number };

type AxisTarget = {
  value: number;
  reason: "center" | "edge" | "spacing";
};

const dedupeGuides = (guides: AlignmentGuide[]) => {
  const map = new Map<string, AlignmentGuide>();
  guides.forEach((guide) => {
    const key = `${guide.orientation}-${guide.reason}-${Math.round(
      guide.position
    )}`;
    if (!map.has(key)) {
      map.set(key, guide);
    }
  });
  return Array.from(map.values());
};

export const useSmartGuides = ({
  canvasWidth,
  canvasHeight,
  threshold = 6,
}: {
  canvasWidth: number;
  canvasHeight: number;
  threshold?: number;
}) => {
  const [guides, setGuides] = useState<AlignmentGuide[]>([]);
  const snapOffsetRef = useRef({ x: 0, y: 0 });

  const compute = useCallback(
    ({
      activeRect,
      otherRects,
      activeX,
      activeY,
    }: {
      activeRect: Rect;
      otherRects: Rect[];
      activeX?: number[];
      activeY?: number[];
    }): SmartGuideState => {
      const activeXPoints =
        activeX === undefined
          ? [
              activeRect.x,
              activeRect.x + activeRect.width / 2,
              activeRect.x + activeRect.width,
            ]
          : activeX;
      const activeYPoints =
        activeY === undefined
          ? [
              activeRect.y,
              activeRect.y + activeRect.height / 2,
              activeRect.y + activeRect.height,
            ]
          : activeY;

      const targetX: AxisTarget[] = [
        { value: 0, reason: "edge" },
        { value: canvasWidth / 2, reason: "center" },
        { value: canvasWidth, reason: "edge" },
      ];
      const targetY: AxisTarget[] = [
        { value: 0, reason: "edge" },
        { value: canvasHeight / 2, reason: "center" },
        { value: canvasHeight, reason: "edge" },
      ];

      otherRects.forEach((rect) => {
        targetX.push(
          { value: rect.x, reason: "edge" },
          { value: rect.x + rect.width / 2, reason: "center" },
          { value: rect.x + rect.width, reason: "edge" }
        );
        targetY.push(
          { value: rect.y, reason: "edge" },
          { value: rect.y + rect.height / 2, reason: "center" },
          { value: rect.y + rect.height, reason: "edge" }
        );
      });

      let bestX: { delta: number; distance: number } | null = null;
      let bestY: { delta: number; distance: number } | null = null;
      const nextGuides: AlignmentGuide[] = [];

      targetX.forEach((target) => {
        activeXPoints.forEach((ax) => {
          const delta = target.value - ax;
          const distance = Math.abs(delta);
          if (distance > threshold) return;
          nextGuides.push({
            id: `v-${target.value}-${target.reason}`,
            orientation: "vertical",
            position: target.value,
            reason: target.reason,
          });
          if (!bestX || distance < bestX.distance) {
            bestX = { delta, distance };
          }
        });
      });

      targetY.forEach((target) => {
        activeYPoints.forEach((ay) => {
          const delta = target.value - ay;
          const distance = Math.abs(delta);
          if (distance > threshold) return;
          nextGuides.push({
            id: `h-${target.value}-${target.reason}`,
            orientation: "horizontal",
            position: target.value,
            reason: target.reason,
          });
          if (!bestY || distance < bestY.distance) {
            bestY = { delta, distance };
          }
        });
      });

      const snapOffset = {
        x: bestX ? bestX.delta : 0,
        y: bestY ? bestY.delta : 0,
      };
      snapOffsetRef.current = snapOffset;
      const uniqueGuides = dedupeGuides(nextGuides);
      setGuides(uniqueGuides);

      return { guides: uniqueGuides, snapOffset };
    },
    [canvasHeight, canvasWidth, threshold]
  );

  const clear = useCallback(() => {
    snapOffsetRef.current = { x: 0, y: 0 };
    setGuides([]);
  }, []);

  return {
    guides,
    snapOffsetRef,
    compute,
    clear,
  };
};
