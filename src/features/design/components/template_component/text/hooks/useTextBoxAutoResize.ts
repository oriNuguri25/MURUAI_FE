import { useEffect, type MutableRefObject, type RefObject } from "react";
import type { Rect } from "../../../../model/canvasTypes";
import { computeTextBoxSize } from "../textBoxMeasure";

type UseTextBoxAutoResizeProps = {
  isEditing: boolean;
  widthMode: "auto" | "fixed";
  minWidth: number;
  minHeight: number;
  textAlign: "left" | "center" | "right";
  onRectChange?: (rect: Rect) => void;
  rect: Rect;
  richText?: string;
  text: string;
  styleSignature: string;
  rectRef: MutableRefObject<Rect>;
  editableRef: RefObject<HTMLDivElement | null>;
  measureRef: RefObject<HTMLDivElement | null>;
  boxRef: RefObject<HTMLDivElement | null>;
  isResizingRef: MutableRefObject<boolean>;
};

export const useTextBoxAutoResize = ({
  isEditing,
  widthMode,
  minWidth,
  minHeight,
  textAlign,
  onRectChange,
  rect,
  richText,
  text,
  styleSignature,
  rectRef,
  editableRef,
  measureRef,
  boxRef,
  isResizingRef,
}: UseTextBoxAutoResizeProps) => {
  useEffect(() => {
    if (!onRectChange) return;
    if (isResizingRef.current) return;
    const measure = measureRef.current;
    if (!measure) return;
    const editableNode = editableRef.current;
    const currentRect = rectRef.current ?? rect;
    const rectWidth = currentRect.width;
    const rectHeight = currentRect.height;
    const maxWidth = boxRef.current?.parentElement?.clientWidth ?? rectWidth;
    const { targetWidth, targetHeight } = computeTextBoxSize({
      measure,
      htmlContent: isEditing ? editableNode?.innerHTML : richText,
      text,
      rect: currentRect,
      minWidth,
      minHeight,
      widthMode,
      maxWidth,
    });
    const isAutoWidth = widthMode !== "fixed";

    if (isAutoWidth) {
      // Auto mode: keep the center anchored as width changes.
      const widthChanged = Math.abs(targetWidth - rectWidth) > 1;
      const heightChanged = Math.abs(targetHeight - rectHeight) > 1;
      if (widthChanged || heightChanged) {
        const widthDelta = targetWidth - rectWidth;
        const newX =
          textAlign === "right"
            ? currentRect.x + (rectWidth - targetWidth)
            : textAlign === "center"
            ? currentRect.x - widthDelta / 2
            : currentRect.x;
        onRectChange({
          ...currentRect,
          x: newX,
          width: targetWidth,
          height: targetHeight,
        });
      }
    } else {
      // Fixed mode: keep width and adjust height only.
      const heightChanged = Math.abs(targetHeight - rectHeight) > 1;
      if (heightChanged) {
        onRectChange({
          ...currentRect,
          height: targetHeight,
        });
      }
    }
  }, [
    isEditing,
    widthMode,
    minHeight,
    minWidth,
    onRectChange,
    rect,
    richText,
    styleSignature,
    text,
    textAlign,
    boxRef,
    editableRef,
    isResizingRef,
    measureRef,
    rectRef,
  ]);
};
