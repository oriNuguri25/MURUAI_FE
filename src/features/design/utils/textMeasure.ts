type MeasureOptions = {
  lineHeight?: number;
  letterSpacing?: number;
  fontFamily?: string;
  maxWidth?: number;
};

export const measureTextBoxSize = (
  text: string,
  fontSize: number,
  fontWeight: "normal" | "bold",
  options: MeasureOptions = {}
) => {
  const safeText = text ?? "";
  const lines = safeText.split(/\r?\n/);
  const maxLineLength = Math.max(...lines.map((line) => line.length), 1);
  const fallbackWidth = Math.ceil(maxLineLength * fontSize * 0.8);
  const lineHeight = options.lineHeight ?? 1.2;
  const fallbackHeight = Math.ceil(lines.length * fontSize * lineHeight);
  if (typeof document === "undefined") {
    return {
      width: options.maxWidth ?? fallbackWidth,
      height: fallbackHeight,
    };
  }

  const span = document.createElement("span");
  span.textContent = safeText || " ";
  span.style.position = "absolute";
  span.style.visibility = "hidden";
  span.style.padding = "0";
  span.style.border = "none";
  const maxWidth = options.maxWidth;

  // 먼저 단일 라인으로 텍스트 폭 측정
  span.style.whiteSpace = "pre";
  span.style.display = "inline-block";
  span.style.fontSize = `${fontSize}px`;
  span.style.fontWeight = fontWeight === "bold" ? "700" : "400";
  if (options.lineHeight != null) {
    span.style.lineHeight = `${options.lineHeight}`;
  }
  if (options.letterSpacing != null && options.letterSpacing !== 0) {
    span.style.letterSpacing = `${options.letterSpacing}px`;
  }
  const computedFamily =
    options.fontFamily ?? getComputedStyle(document.body).fontFamily;
  if (computedFamily) {
    span.style.fontFamily = computedFamily;
  }
  document.body.appendChild(span);

  // 측정 오차 보정을 위한 버퍼
  const widthBuffer = 4;
  const heightBuffer = 2;

  const singleLineWidth = Math.ceil(span.getBoundingClientRect().width) + widthBuffer;

  // maxWidth가 있고 텍스트가 maxWidth를 초과하면 줄바꿈 적용
  const hasMaxWidth = typeof maxWidth === "number" && maxWidth > 0;
  const exceedsMaxWidth = hasMaxWidth && singleLineWidth > maxWidth;

  let finalWidth: number;
  let finalHeight: number;

  if (exceedsMaxWidth) {
    // maxWidth로 제한하고 줄바꿈 허용
    span.style.width = `${maxWidth}px`;
    span.style.whiteSpace = "pre-wrap";
    const rect = span.getBoundingClientRect();
    finalWidth = maxWidth;
    finalHeight = Math.ceil(rect.height) + heightBuffer;
  } else {
    // 단일 라인 유지
    const rect = span.getBoundingClientRect();
    finalWidth = singleLineWidth;
    finalHeight = Math.ceil(rect.height) + heightBuffer;
  }

  span.remove();
  return {
    width: finalWidth || fallbackWidth,
    height: finalHeight || fallbackHeight,
  };
};
