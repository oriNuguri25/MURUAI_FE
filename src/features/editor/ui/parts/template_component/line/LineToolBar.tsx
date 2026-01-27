import type { PointerEvent as ReactPointerEvent } from "react";
import { useNumberInput } from "../../../../model/useNumberInput";
import { clamp } from "../../../../utils/domUtils";
import ColorPickerPopover from "../../ColorPickerPopover";

interface LineToolBarProps {
  isVisible: boolean;
  color: string;
  width: number;
  minWidth?: number;
  maxWidth?: number;
  length?: number;
  angle?: number;
  onColorChange: (value: string) => void;
  onWidthChange: (value: number) => void;
  onLengthChange?: (value: number) => void;
  onAngleChange?: (value: number) => void;
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

const LineToolBar = ({
  isVisible,
  color,
  width,
  minWidth = 1,
  maxWidth = 20,
  length,
  angle,
  onColorChange,
  onWidthChange,
  onLengthChange,
  onAngleChange,
  onPointerDown,
}: LineToolBarProps) => {
  const widthInput = useNumberInput({
    value: width,
    min: minWidth,
    max: maxWidth,
    onChange: onWidthChange,
  });

  const lengthInput = useNumberInput({
    value: length ?? 0,
    min: 1,
    max: 9999,
    onChange: onLengthChange ?? (() => {}),
  });

  const angleInput = useNumberInput({
    value: angle ?? 0,
    min: 0,
    max: 359,
    onChange: onAngleChange ?? (() => {}),
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
          onChange={(event) => {
            onWidthChange(
              clamp(Number(event.target.value), minWidth, maxWidth),
            );
          }}
          className="w-28"
        />
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={widthInput.displayValue}
          onChange={(event) => {
            widthInput.handleChange(event.target.value);
          }}
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

      {length !== undefined && onLengthChange && (
        <div className="flex items-center gap-2">
          <span className="text-14-regular text-black-60">길이</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={lengthInput.displayValue}
            onChange={(event) => {
              lengthInput.handleChange(event.target.value);
            }}
            onBlur={lengthInput.handleBlur}
            onFocus={lengthInput.handleFocus}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                lengthInput.commit();
                event.currentTarget.blur();
              }
            }}
            className="no-spinner w-14 rounded-lg border border-black-30 px-2 py-1 text-center text-14-regular text-black-90"
          />
        </div>
      )}

      {angle !== undefined && onAngleChange && (
        <div className="flex items-center gap-2">
          <span className="text-14-regular text-black-60">각도</span>
          <input
            type="number"
            min={0}
            max={359}
            step={1}
            value={angleInput.displayValue}
            onChange={(event) => {
              angleInput.handleChange(event.target.value);
            }}
            onBlur={angleInput.handleBlur}
            onFocus={angleInput.handleFocus}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                angleInput.commit();
                event.currentTarget.blur();
              }
            }}
            className="no-spinner w-15 rounded-lg border border-black-30 px-2 py-1 text-center text-14-regular text-black-90"
          />
          <span className="text-14-regular text-black-60">°</span>
        </div>
      )}
    </div>
  );
};

export default LineToolBar;
