import type { TemplateElement } from "../model/canvasTypes";

export type AacLabelPosition = "top" | "bottom" | "none";

export type AacBoardConfig = {
  rows: number;
  columns: number;
  orientation: "horizontal" | "vertical";
  labelPosition: AacLabelPosition;
};

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;

export const buildAacBoardElements = ({
  rows,
  columns,
  orientation,
  labelPosition,
}: AacBoardConfig): TemplateElement[] => {
  const pageWidthMm = orientation === "horizontal" ? 297 : 210;
  const pageHeightMm = orientation === "horizontal" ? 210 : 297;
  const paddingMm = 12;
  const gapMm = 6;
  const contentWidthMm = pageWidthMm - paddingMm * 2;
  const contentHeightMm = pageHeightMm - paddingMm * 2;
  const cellWidthMm = (contentWidthMm - gapMm * (columns - 1)) / columns;
  const cellHeightMm = (contentHeightMm - gapMm * (rows - 1)) / rows;
  const maxLabelHeightMm = 10;
  const labelDefaults = ["음식", "동물", "옷", "동사"];
  const elements: TemplateElement[] = [];

  let labelIndex = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const cellX = mmToPx(paddingMm + col * (cellWidthMm + gapMm));
      const cellY = mmToPx(paddingMm + row * (cellHeightMm + gapMm));
      const cellWidth = mmToPx(cellWidthMm);
      const cellHeight = mmToPx(cellHeightMm);
      const labelHeight =
        labelPosition === "none"
          ? 0
          : Math.min(
              mmToPx(maxLabelHeightMm),
              Math.max(0, cellHeight * 0.35)
            );
      const imageHeight = Math.max(1, cellHeight - labelHeight);
      const imageY =
        labelPosition === "top" ? cellY + labelHeight : cellY;
      const labelY =
        labelPosition === "bottom" ? cellY + imageHeight : cellY;
      const radius = Math.min(mmToPx(6), Math.min(cellWidth, imageHeight) / 2);

      elements.push({
        type: "roundRect",
        x: cellX,
        y: imageY,
        w: cellWidth,
        h: imageHeight,
        fill: "#ffffff",
        radius,
        border: {
          enabled: true,
          color: "#E5E7EB",
          width: 2,
          style: "solid",
        },
      });

      if (labelPosition !== "none" && labelHeight > 0) {
        const labelText = labelDefaults[labelIndex] ?? "라벨";
        labelIndex += 1;
        elements.push({
          type: "text",
          x: cellX,
          y: labelY,
          w: cellWidth,
          h: labelHeight,
          text: labelText,
          style: {
            fontSize: 14,
            fontWeight: "normal",
            color: "#6B7280",
            underline: false,
            alignX: "center",
            alignY: "middle",
          },
        });
      }
    }
  }

  return elements;
};
