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
  const maxWidth = options.maxWidth;
  const shouldWrap = typeof maxWidth === "number" && maxWidth > 0;
  span.style.whiteSpace = shouldWrap ? "pre-wrap" : "pre";
  if (shouldWrap) {
    span.style.display = "inline-block";
    span.style.width = `${maxWidth}px`;
  }
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
  const rect = span.getBoundingClientRect();
  span.remove();
  return {
    width: shouldWrap ? maxWidth : Math.ceil(rect.width) || fallbackWidth,
    height: Math.ceil(rect.height) || fallbackHeight,
  };
};
