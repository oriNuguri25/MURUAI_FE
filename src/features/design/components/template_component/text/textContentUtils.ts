const stripHtml = (value: string) => {
  if (!value) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return value.replace(/<[^>]*>/g, "");
  }
  const doc = new DOMParser().parseFromString(value, "text/html");
  return doc.body.textContent ?? "";
};

const normalizeTextValue = (value: string) =>
  value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const isTextEmpty = (text?: string, richText?: string) =>
  normalizeTextValue(text ?? "") === "" &&
  normalizeTextValue(stripHtml(richText ?? "")) === "";

export const DEFAULT_LINE_HEIGHT = 1.2;
