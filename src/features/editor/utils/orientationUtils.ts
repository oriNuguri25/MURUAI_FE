export const normalizeOrientationValue = (
  value: unknown,
  fallback: "horizontal" | "vertical"
) => (value === "horizontal" || value === "vertical" ? value : fallback);
