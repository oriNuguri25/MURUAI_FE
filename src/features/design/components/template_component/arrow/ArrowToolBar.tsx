import { RotateCw } from "lucide-react";
import { useEffect, useState, type PointerEvent as ReactPointerEvent } from "react";
import FixedToolBar from "../FixedToolBar";

interface ArrowToolBarProps {
  isVisible: boolean;
  color: string;
  width: number;
  minWidth?: number;
  maxWidth?: number;
  onColorChange: (value: string) => void;
  onWidthChange: (value: number) => void;
  onRotatePointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

const ArrowToolBar = ({
  isVisible,
  color,
  width,
  minWidth = 1,
  maxWidth = 20,
  onColorChange,
  onWidthChange,
  onRotatePointerDown,
  onPointerDown,
}: ArrowToolBarProps) => {
  const clampWidth = (value: number) =>
    Math.min(maxWidth, Math.max(minWidth, value));
  const [widthInput, setWidthInput] = useState(() => String(width));

  useEffect(() => {
    setWidthInput(String(width));
  }, [width]);

  const commitWidth = () => {
    const trimmed = widthInput.trim();
    if (!trimmed) {
      setWidthInput(String(width));
      return;
    }
    const nextValue = Number(trimmed);
    if (!Number.isFinite(nextValue) || nextValue <= 0) {
      setWidthInput(String(width));
      return;
    }
    const clamped = clampWidth(nextValue);
    setWidthInput(String(clamped));
    onWidthChange(clamped);
  };

  return (
    <FixedToolBar isVisible={isVisible} onPointerDown={onPointerDown}
    >
      <button
        type="button"
        onPointerDown={onRotatePointerDown}
        className="flex h-7 items-center gap-1 rounded border border-black-30 px-2 text-14-regular text-black-70 hover:border-primary hover:text-primary transition-colors"
        aria-label="Rotate arrow"
      >
        <RotateCw className="h-4 w-4" />
      </button>
      <div className="flex items-center text-14-regular text-black-60">
        굵기
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={minWidth}
          max={maxWidth}
          value={width}
          onChange={(event) =>
            onWidthChange(clampWidth(Number(event.target.value)))
          }
          className="w-28"
        />
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={widthInput}
          onChange={(event) => {
            const digits = event.target.value.replace(/[^0-9]/g, "");
            setWidthInput(digits);
          }}
          onBlur={commitWidth}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            commitWidth();
          }}
          className="no-spinner w-12 rounded-lg border border-black-30 px-2 py-1 text-center text-14-regular text-black-90"
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-14-regular text-black-60">색상</span>
        <input
          type="color"
          value={color}
          onChange={(event) => onColorChange(event.target.value)}
          className="color-input h-7 w-7 cursor-pointer rounded border border-black-30 bg-white-100 p-0"
          style={{ WebkitAppearance: "none", appearance: "none" }}
        />
      </div>
    </FixedToolBar>
  );
};

export default ArrowToolBar;
