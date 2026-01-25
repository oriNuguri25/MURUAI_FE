import { RotateCw } from "lucide-react";
import type { PointerEvent as ReactPointerEvent } from "react";
import ColorPickerPopover from "../../ColorPickerPopover";
import { useNumberInput } from "../../../../model/useNumberInput";
import { clamp } from "../../../../utils/domUtils";

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
  const widthInput = useNumberInput({
    value: width,
    min: minWidth,
    max: maxWidth,
    onChange: onWidthChange,
  });

  if (!isVisible) return null;

  return (
    <div className="flex items-center gap-3" onPointerDown={onPointerDown}>
      <button
        type="button"
        onPointerDown={onRotatePointerDown}
        className="flex h-7 items-center gap-1 rounded border border-black-30 px-2 text-14-regular text-black-70 hover:border-primary hover:text-primary transition-colors"
        aria-label="Rotate arrow"
      >
        <RotateCw className="h-4 w-4" />
      </button>
      <div className="flex items-center text-14-regular text-black-60">굵기</div>
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
        <ColorPickerPopover value={color} onChange={onColorChange} />
      </div>
    </div>
  );
};

export default ArrowToolBar;
