import {
  useEffect,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignStartHorizontal,
  TextAlignCenter,
  TextAlignStart,
  TextAlignEnd,
  Underline,
} from "lucide-react";

interface TextToolBarProps {
  isVisible: boolean;
  minFontSize: number;
  maxFontSize: number;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  color: string;
  isBold: boolean;
  isUnderline: boolean;
  align: "left" | "center" | "right";
  alignY: "top" | "middle" | "bottom";
  onFontSizeChange: (value: number) => void;
  onFontSizeStep: (delta: number) => void;
  onLineHeightChange: (value: number) => void;
  onLetterSpacingChange: (value: number) => void;
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
  lineHeight,
  letterSpacing,
  color,
  isBold,
  isUnderline,
  align,
  alignY,
  onFontSizeChange,
  onFontSizeStep,
  onLineHeightChange,
  onLetterSpacingChange,
  onColorChange,
  onToggleBold,
  onToggleUnderline,
  onAlignChange,
  onAlignYChange,
  onPointerDown,
}: TextToolBarProps) => {
  const clampFontSize = (value: number) =>
    Math.min(maxFontSize, Math.max(minFontSize, value));
  const clampLineHeight = (value: number) =>
    Math.min(5, Math.max(0.5, value));
  const clampLetterSpacing = (value: number) =>
    Math.min(20, Math.max(-10, value));
  const formatNumber = (value: number) =>
    String(Math.round(value * 100) / 100);
  const [fontSizeInput, setFontSizeInput] = useState(() => String(fontSize));
  const [isFontSizeEditing, setIsFontSizeEditing] = useState(false);
  const [lineHeightInput, setLineHeightInput] = useState(() =>
    formatNumber(lineHeight)
  );
  const [isLineHeightEditing, setIsLineHeightEditing] = useState(false);
  const [letterSpacingInput, setLetterSpacingInput] = useState(() =>
    formatNumber(letterSpacing)
  );
  const [isLetterSpacingEditing, setIsLetterSpacingEditing] = useState(false);

  if (!isVisible) return null;

  useEffect(() => {
    if (!isFontSizeEditing) {
      setFontSizeInput(String(fontSize));
    }
  }, [fontSize, isFontSizeEditing]);

  useEffect(() => {
    if (!isLineHeightEditing) {
      setLineHeightInput(formatNumber(lineHeight));
    }
  }, [isLineHeightEditing, lineHeight]);

  useEffect(() => {
    if (!isLetterSpacingEditing) {
      setLetterSpacingInput(formatNumber(letterSpacing));
    }
  }, [isLetterSpacingEditing, letterSpacing]);

  const commitFontSizeInput = () => {
    const trimmed = fontSizeInput.trim();
    if (!trimmed) {
      setFontSizeInput(String(fontSize));
      return;
    }
    const nextValue = Number(trimmed);
    if (!Number.isFinite(nextValue) || nextValue <= 0) {
      setFontSizeInput(String(fontSize));
      return;
    }
    const clamped = clampFontSize(nextValue);
    onFontSizeChange(clamped);
    setFontSizeInput(String(clamped));
  };

  const commitLineHeightInput = () => {
    const trimmed = lineHeightInput.trim();
    if (!trimmed) {
      setLineHeightInput(formatNumber(lineHeight));
      return;
    }
    const nextValue = Number(trimmed);
    if (!Number.isFinite(nextValue) || nextValue <= 0) {
      setLineHeightInput(formatNumber(lineHeight));
      return;
    }
    const clamped = clampLineHeight(nextValue);
    onLineHeightChange(clamped);
    setLineHeightInput(formatNumber(clamped));
  };

  const commitLetterSpacingInput = () => {
    const trimmed = letterSpacingInput.trim();
    if (!trimmed) {
      setLetterSpacingInput(formatNumber(letterSpacing));
      return;
    }
    const nextValue = Number(trimmed);
    if (!Number.isFinite(nextValue)) {
      setLetterSpacingInput(formatNumber(letterSpacing));
      return;
    }
    const clamped = clampLetterSpacing(nextValue);
    onLetterSpacingChange(clamped);
    setLetterSpacingInput(formatNumber(clamped));
  };

  return (
    <div
      className="flex flex-nowrap items-center gap-2 whitespace-nowrap"
      onPointerDown={onPointerDown}
    >
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
          value={isFontSizeEditing ? fontSizeInput : String(fontSize)}
          onChange={(event) => {
            const digits = event.target.value.replace(/[^0-9]/g, "");
            setFontSizeInput(digits);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            commitFontSizeInput();
            setIsFontSizeEditing(false);
            event.currentTarget.blur();
          }}
          onBlur={() => {
            if (!isFontSizeEditing) return;
            setIsFontSizeEditing(false);
            commitFontSizeInput();
          }}
          onFocus={() => {
            setFontSizeInput(String(fontSize));
            setIsFontSizeEditing(true);
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
      <div className="flex items-center gap-1">
        <span className="text-14-regular text-black-60">자간</span>
        <input
          type="text"
          inputMode="decimal"
          value={
            isLetterSpacingEditing
              ? letterSpacingInput
              : formatNumber(letterSpacing)
          }
          onChange={(event) => {
            const nextValue = event.target.value.replace(/[^0-9.-]/g, "");
            setLetterSpacingInput(nextValue);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            commitLetterSpacingInput();
            setIsLetterSpacingEditing(false);
            event.currentTarget.blur();
          }}
          onBlur={() => {
            if (!isLetterSpacingEditing) return;
            setIsLetterSpacingEditing(false);
            commitLetterSpacingInput();
          }}
          onFocus={(event) => {
            setLetterSpacingInput(formatNumber(letterSpacing));
            setIsLetterSpacingEditing(true);
            event.target.select();
          }}
          className="no-spinner w-12 rounded border border-black-30 px-1 py-1 text-center text-14-regular text-black-90"
          style={{
            textAlign: "center",
            WebkitAppearance: "none",
            MozAppearance: "textfield",
            appearance: "textfield",
          }}
        />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-14-regular text-black-60">행간</span>
        <input
          type="text"
          inputMode="decimal"
          value={
            isLineHeightEditing ? lineHeightInput : formatNumber(lineHeight)
          }
          onChange={(event) => {
            const nextValue = event.target.value.replace(/[^0-9.-]/g, "");
            setLineHeightInput(nextValue);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            commitLineHeightInput();
            setIsLineHeightEditing(false);
            event.currentTarget.blur();
          }}
          onBlur={() => {
            if (!isLineHeightEditing) return;
            setIsLineHeightEditing(false);
            commitLineHeightInput();
          }}
          onFocus={(event) => {
            setLineHeightInput(formatNumber(lineHeight));
            setIsLineHeightEditing(true);
            event.target.select();
          }}
          className="no-spinner w-12 rounded border border-black-30 px-1 py-1 text-center text-14-regular text-black-90"
          style={{
            textAlign: "center",
            WebkitAppearance: "none",
            MozAppearance: "textfield",
            appearance: "textfield",
          }}
        />
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
    </div>
  );
};

export default TextToolBar;
