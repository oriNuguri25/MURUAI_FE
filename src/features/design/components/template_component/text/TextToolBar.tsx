import { type PointerEvent as ReactPointerEvent } from "react";
import {
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignStartHorizontal,
  TextAlignCenter,
  TextAlignStart,
  TextAlignEnd,
  Underline,
} from "lucide-react";
import FixedToolBar from "../FixedToolBar";

interface TextToolBarProps {
  isVisible: boolean;
  minFontSize: number;
  maxFontSize: number;
  fontSize: number;
  color: string;
  isBold: boolean;
  isUnderline: boolean;
  align: "left" | "center" | "right";
  alignY: "top" | "middle" | "bottom";
  onFontSizeChange: (value: number) => void;
  onFontSizeStep: (delta: number) => void;
  onColorChange: (value: string) => void;
  onToggleBold: () => void;
  onToggleUnderline: () => void;
  onAlignChange: (value: "left" | "center" | "right") => void;
  onAlignYChange: (value: "top" | "middle" | "bottom") => void;
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

const TextToolBar = ({
  isVisible,
  minFontSize,
  maxFontSize,
  fontSize,
  color,
  isBold,
  isUnderline,
  align,
  alignY,
  onFontSizeChange,
  onFontSizeStep,
  onColorChange,
  onToggleBold,
  onToggleUnderline,
  onAlignChange,
  onAlignYChange,
  onPointerDown,
}: TextToolBarProps) => {
  const clampFontSize = (value: number) =>
    Math.min(maxFontSize, Math.max(minFontSize, value));

  return (
    <FixedToolBar isVisible={isVisible} onPointerDown={onPointerDown}>
      <div className="flex items-center text-14-regular text-black-60">
        텍스트 크기
      </div>
      <div className="flex items-center gap-1 rounded border border-black-30 px-1">
        <button
          type="button"
          onClick={() => onFontSizeStep(-1)}
          className="flex h-7 w-7 items-center justify-center text-14-semibold text-black-70"
          aria-label="Decrease font size"
        >
          -
        </button>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={String(fontSize)}
          onChange={(event) => {
            const digits = event.target.value.replace(/[^0-9]/g, "");
            if (!digits) return;
            onFontSizeChange(clampFontSize(Number(digits)));
          }}
          className="no-spinner w-12 appearance-none border-x border-black-30 px-1 py-1 text-center text-14-regular text-black-90"
          style={{
            textAlign: "center",
            WebkitAppearance: "none",
            MozAppearance: "textfield",
            appearance: "textfield",
          }}
        />
        <button
          type="button"
          onClick={() => onFontSizeStep(1)}
          className="flex h-7 w-7 items-center justify-center text-14-semibold text-black-70"
          aria-label="Increase font size"
        >
          +
        </button>
      </div>
      <label className="flex items-center gap-2">
        <span className="text-14-regular text-black-60">텍스트 색상</span>
        <input
          type="color"
          value={color}
          onChange={(event) => onColorChange(event.target.value)}
          className="h-7 w-7 cursor-pointer rounded border border-black-30 bg-white-100 p-0"
        />
      </label>
      <button
        type="button"
        onClick={onToggleBold}
        className={`flex h-7 w-7 items-center justify-center rounded border text-14-semibold ${
          isBold
            ? "border-primary text-primary"
            : "border-black-30 text-black-70"
        }`}
        aria-label="Bold"
      >
        B
      </button>
      <button
        type="button"
        onClick={onToggleUnderline}
        className={`flex h-7 w-7 items-center justify-center rounded border ${
          isUnderline
            ? "border-primary text-primary"
            : "border-black-30 text-black-70"
        }`}
        aria-label="Underline"
      >
        <Underline className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-1">
        {(
          [
            { key: "left", Icon: TextAlignStart, label: "Align left" },
            { key: "center", Icon: TextAlignCenter, label: "Align center" },
            { key: "right", Icon: TextAlignEnd, label: "Align right" },
          ] as const
        ).map(({ key, Icon, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onAlignChange(key)}
            className={`flex h-7 w-7 items-center justify-center rounded border ${
              align === key
                ? "border-primary text-primary"
                : "border-black-30 text-black-70"
            }`}
            aria-label={label}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        {(
          [
            { key: "top", label: "Align top", Icon: AlignStartHorizontal },
            { key: "middle", label: "Align middle", Icon: AlignCenterVertical },
            { key: "bottom", label: "Align bottom", Icon: AlignEndHorizontal },
          ] as const
        ).map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onAlignYChange(key)}
            className={`flex h-7 w-7 items-center justify-center rounded border text-12-medium ${
              alignY === key
                ? "border-primary text-primary"
                : "border-black-30 text-black-70"
            }`}
            aria-label={label}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    </FixedToolBar>
  );
};

export default TextToolBar;
