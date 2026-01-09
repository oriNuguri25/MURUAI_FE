import type { PointerEvent as ReactPointerEvent } from "react";
import { useNumberInput } from "../../../model/useNumberInput";
import { clamp } from "../../../utils/domUtils";

interface LineToolBarProps {
  isVisible: boolean;
  color: string;
  width: number;
  minWidth?: number;
  maxWidth?: number;
  onColorChange: (value: string) => void;
  onWidthChange: (value: number) => void;
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

const LineToolBar = ({
  isVisible,
  color,
  width,
  minWidth = 1,
  maxWidth = 20,
  onColorChange,
  onWidthChange,
  onPointerDown,
}: LineToolBarProps) => {
  const widthInput = useNumberInput({
    value: width,
    min: minWidth,
    max: maxWidth,
    onChange: onWidthChange,
  });

  if (!isVisible) return null;

  return (
    <div className="flex items-center gap-3" onPointerDown={onPointerDown}>
      <div className="flex items-center text-14-regular text-black-60">
        선 굵기
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={minWidth}
          max={maxWidth}
          value={width}
          onChange={(event) =>
            onWidthChange(clamp(Number(event.target.value), minWidth, maxWidth))
          }
          className="w-28"
        />
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={widthInput.displayValue}
          onChange={(event) => widthInput.handleChange(event.target.value)}
          onBlur={widthInput.handleBlur}
          onFocus={widthInput.handleFocus}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              widthInput.commit();
              event.currentTarget.blur();
            }
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
    </div>
  );
};

export default LineToolBar;
