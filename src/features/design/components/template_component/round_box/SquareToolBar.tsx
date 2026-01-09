import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Ban, Upload } from "lucide-react";
import FixedToolBar from "../FixedToolBar";

type BorderStyle = "solid" | "dashed" | "dotted" | "double";

interface SquareToolBarProps {
  isVisible: boolean;
  showRadius?: boolean;
  borderRadius: number;
  minBorderRadius?: number;
  maxBorderRadius?: number;
  color: string;
  borderEnabled?: boolean;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: BorderStyle;
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  onBorderRadiusChange: (value: number) => void;
  onBorderRadiusStep: (delta: number) => void;
  onColorChange: (value: string) => void;
  onImageUpload: (imageUrl: string) => void;
  onBorderEnabledChange?: (value: boolean) => void;
  onBorderStyleChange?: (value: BorderStyle) => void;
  onBorderColorChange?: (value: string) => void;
  onBorderWidthChange?: (value: number) => void;
  onSizeChange?: (width: number, height: number) => void;
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

const SquareToolBar = ({
  isVisible,
  showRadius = true,
  borderRadius,
  minBorderRadius = 0,
  maxBorderRadius = 100,
  color,
  borderEnabled = false,
  borderColor = "#000000",
  borderWidth = 2,
  borderStyle = "solid",
  width,
  height,
  onBorderRadiusChange,
  onBorderRadiusStep,
  onColorChange,
  onImageUpload,
  onBorderEnabledChange,
  onBorderStyleChange,
  onBorderColorChange,
  onBorderWidthChange,
  onSizeChange,
  onPointerDown,
}: SquareToolBarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isBorderPanelOpen, setIsBorderPanelOpen] = useState(false);
  const [widthInput, setWidthInput] = useState(() =>
    width !== undefined ? String(Math.round(width)) : ""
  );
  const [heightInput, setHeightInput] = useState(() =>
    height !== undefined ? String(Math.round(height)) : ""
  );
  const [isWidthEditing, setIsWidthEditing] = useState(false);
  const [isHeightEditing, setIsHeightEditing] = useState(false);
  const clampRadius = (value: number) =>
    Math.min(maxBorderRadius, Math.max(minBorderRadius, value));
  const clampBorderWidth = (value: number) => Math.min(20, Math.max(1, value));
  const clampWidth = (value: number) => Math.max(1, value);
  const clampHeight = (value: number) => Math.max(1, value);
  const displayWidth = isWidthEditing
    ? widthInput
    : width !== undefined
    ? String(Math.round(width))
    : "";
  const displayHeight = isHeightEditing
    ? heightInput
    : height !== undefined
    ? String(Math.round(height))
    : "";

  const commitWidthInput = (value: string) => {
    if (width === undefined || height === undefined || !onSizeChange) return;
    const digits = value.replace(/[^0-9]/g, "");
    if (!digits) {
      setWidthInput(String(Math.round(width)));
      return;
    }
    const nextWidth = clampWidth(Number(digits));
    onSizeChange(nextWidth, height);
    setWidthInput(String(Math.round(nextWidth)));
  };

  const commitHeightInput = (value: string) => {
    if (width === undefined || height === undefined || !onSizeChange) return;
    const digits = value.replace(/[^0-9]/g, "");
    if (!digits) {
      setHeightInput(String(Math.round(height)));
      return;
    }
    const nextHeight = clampHeight(Number(digits));
    onSizeChange(width, nextHeight);
    setHeightInput(String(Math.round(nextHeight)));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 이미지 파일인지 확인
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    // FileReader로 이미지를 Data URL로 변환
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      onImageUpload(imageUrl);
    };
    reader.readAsDataURL(file);

    // input 초기화 (같은 파일 다시 선택 가능하도록)
    event.target.value = "";
  };

  if (!isVisible) return null;

  const borderStyleOptions: Array<BorderStyle | "none"> = [
    "none",
    "solid",
    "dashed",
    "double",
    "dotted",
  ];
  const activeStyle = borderEnabled ? borderStyle : "none";
  const handleBorderStyleSelect = (style: BorderStyle | "none") => {
    if (style === "none") {
      onBorderEnabledChange?.(false);
      return;
    }
    if (!borderEnabled) {
      onBorderEnabledChange?.(true);
    }
    onBorderStyleChange?.(style);
  };

  return (
    <FixedToolBar isVisible={isVisible} onPointerDown={onPointerDown}>
      {width !== undefined && height !== undefined && onSizeChange && (
        <>
          <div className="flex items-center text-14-regular text-black-60">
            가로
          </div>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={displayWidth}
            onChange={(event) => {
              const digits = event.target.value.replace(/[^0-9]/g, "");
              setWidthInput(digits);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitWidthInput(widthInput);
                setIsWidthEditing(false);
                event.currentTarget.blur();
              }
            }}
            onBlur={() => {
              if (!isWidthEditing) return;
              setIsWidthEditing(false);
              commitWidthInput(widthInput);
            }}
            onFocus={(event) => {
              if (width !== undefined) {
                setWidthInput(String(Math.round(width)));
              }
              setIsWidthEditing(true);
              event.target.select();
            }}
            className="no-spinner w-16 rounded border border-black-30 px-2 py-1 text-center text-14-regular text-black-90"
            style={{
              textAlign: "center",
              WebkitAppearance: "none",
              MozAppearance: "textfield",
              appearance: "textfield",
            }}
          />
          <div className="flex items-center text-14-regular text-black-60">
            세로
          </div>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={displayHeight}
            onChange={(event) => {
              const digits = event.target.value.replace(/[^0-9]/g, "");
              setHeightInput(digits);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitHeightInput(heightInput);
                setIsHeightEditing(false);
                event.currentTarget.blur();
              }
            }}
            onBlur={() => {
              if (!isHeightEditing) return;
              setIsHeightEditing(false);
              commitHeightInput(heightInput);
            }}
            onFocus={(event) => {
              if (height !== undefined) {
                setHeightInput(String(Math.round(height)));
              }
              setIsHeightEditing(true);
              event.target.select();
            }}
            className="no-spinner w-16 rounded border border-black-30 px-2 py-1 text-center text-14-regular text-black-90"
            style={{
              textAlign: "center",
              WebkitAppearance: "none",
              MozAppearance: "textfield",
              appearance: "textfield",
            }}
          />
        </>
      )}
      {showRadius && (
        <>
          <div className="flex items-center text-14-regular text-black-60">
            모서리
          </div>
          <div className="flex items-center gap-1 rounded border border-black-30 px-1">
            <button
              type="button"
              onClick={() => onBorderRadiusStep(-1)}
              className="flex h-7 w-7 items-center justify-center text-14-semibold text-black-70"
              aria-label="Decrease border radius"
            >
              -
            </button>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={String(Math.round(borderRadius))}
              onChange={(event) => {
                const digits = event.target.value.replace(/[^0-9]/g, "");
                if (!digits) return;
                onBorderRadiusChange(clampRadius(Number(digits)));
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
              onClick={() => onBorderRadiusStep(1)}
              className="flex h-7 w-7 items-center justify-center text-14-semibold text-black-70"
              aria-label="Increase border radius"
            >
              +
            </button>
          </div>
        </>
      )}
      <label className="flex items-center gap-2">
        <span className="text-14-regular text-black-60">박스 색상</span>
        <input
          type="color"
          value={color}
          onChange={(event) => onColorChange(event.target.value)}
          className="color-input h-7 w-7 cursor-pointer rounded border border-black-30 bg-white-100 p-0 overflow-hidden"
          style={{ WebkitAppearance: "none", appearance: "none" }}
        />
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsBorderPanelOpen((prev) => !prev)}
          className={`flex h-7 items-center justify-center rounded border px-2 text-14-regular ${
            borderEnabled || isBorderPanelOpen
              ? "border-primary text-primary"
              : "border-black-30 text-black-70"
          }`}
          aria-label="Border settings"
        >
          테두리
        </button>
        {isBorderPanelOpen && (
          <div
            className="absolute left-0 top-full mt-2 w-72 rounded-xl border border-black-25 bg-white-100 p-3 shadow-lg"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              {borderStyleOptions.map((styleOption) => {
                const isActive = activeStyle === styleOption;
                const buttonClass = `flex h-12 w-12 items-center justify-center rounded-lg border ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-black-30 text-black-70"
                }`;
                if (styleOption === "none") {
                  return (
                    <button
                      key={styleOption}
                      type="button"
                      onClick={() => handleBorderStyleSelect(styleOption)}
                      className={buttonClass}
                      aria-label="No border"
                    >
                      <Ban className="h-5 w-5" />
                    </button>
                  );
                }
                return (
                  <button
                    key={styleOption}
                    type="button"
                    onClick={() =>
                      handleBorderStyleSelect(styleOption as BorderStyle)
                    }
                    className={buttonClass}
                    aria-label={`${styleOption} border`}
                  >
                    <span
                      className="block w-6"
                      style={{
                        borderTopWidth: 2,
                        borderTopStyle: styleOption,
                        borderTopColor: "currentColor",
                      }}
                    />
                  </button>
                );
              })}
            </div>
            <div className="mt-4 text-14-regular text-black-70">
              스트로크 굵기
            </div>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={20}
                value={borderWidth}
                disabled={!borderEnabled}
                onChange={(event) =>
                  onBorderWidthChange?.(
                    clampBorderWidth(Number(event.target.value))
                  )
                }
                className="flex-1"
              />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={String(borderWidth)}
                onChange={(event) => {
                  const digits = event.target.value.replace(/[^0-9]/g, "");
                  if (!digits) return;
                  onBorderWidthChange?.(clampBorderWidth(Number(digits)));
                }}
                disabled={!borderEnabled}
                className="no-spinner w-12 rounded-lg border border-black-30 px-2 py-1 text-center text-14-regular text-black-90 disabled:bg-black-10"
              />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-14-regular text-black-60">색상</span>
              <input
                type="color"
                value={borderColor}
                onChange={(event) => onBorderColorChange?.(event.target.value)}
                disabled={!borderEnabled}
                className="color-input h-7 w-7 cursor-pointer rounded border border-black-30 bg-white-100 p-0 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ WebkitAppearance: "none", appearance: "none" }}
              />
            </div>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="flex h-7 items-center gap-1.5 rounded border border-black-30 px-2 text-black-70 hover:border-primary hover:text-primary transition-colors"
        aria-label="Upload image"
      >
        <Upload className="h-4 w-4" />
        <span className="text-14-regular">이미지</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </FixedToolBar>
  );
};

export default SquareToolBar;
