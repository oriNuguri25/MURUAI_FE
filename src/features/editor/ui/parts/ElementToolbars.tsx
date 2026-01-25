import { lazy, Suspense, type Dispatch, type SetStateAction } from "react";
import SquareToolBar from "./template_component/round_box/SquareToolBar";
import ArrowToolBar from "./template_component/arrow/ArrowToolBar";
import LineToolBar from "./template_component/line/LineToolBar";
import type {
  CanvasElement,
  LineElement,
  ShapeElement,
} from "../../model/canvasTypes";
import type { Page } from "../../model/pageTypes";
import type { AacLabelPosition } from "../../utils/aacBoardUtils";

const AacToolBar = lazy(() => import("./AacToolBar"));

type BorderStyle = "solid" | "dashed" | "dotted" | "double";

type LineToolbarData = {
  element: LineElement;
  stroke: { color: string; width: number };
};

type ShapeToolbarData = {
  element: ShapeElement;
  rect: { x: number; y: number; width: number; height: number };
  radius: number;
  minRadius: number;
  maxRadius: number;
  clampRadius: (value: number) => number;
  colorValue: string;
  borderEnabled: boolean;
  borderColor: string;
  borderWidth: number;
  borderStyle: BorderStyle;
};

type AacToolbarData = {
  labelPosition: AacLabelPosition;
  cardCount: number;
};

type ElementToolbarsProps = {
  shapeToolbarData: ShapeToolbarData | null;
  lineToolbarData: LineToolbarData | null;
  aacToolbarData: AacToolbarData | null;
  selectedPageId: string;
  setPages: Dispatch<SetStateAction<Page[]>>;
  onAacLabelPositionChange?: (position: AacLabelPosition) => void;
};

const ElementToolbars = ({
  shapeToolbarData,
  lineToolbarData,
  aacToolbarData,
  selectedPageId,
  setPages,
  onAacLabelPositionChange,
}: ElementToolbarsProps) => {
  const updateSelectedPageElement = (
    elementId: string,
    updater: (element: CanvasElement) => CanvasElement
  ) => {
    setPages((prevPages) =>
      prevPages.map((page) =>
        page.id === selectedPageId
          ? {
              ...page,
              elements: page.elements.map((el) =>
                el.id === elementId ? updater(el) : el
              ),
            }
          : page
      )
    );
  };

  // AAC 카드도 기본 shapeToolbar를 표시하고, 추가로 aacToolbar도 함께 표시
  const showShapeToolbar = !!shapeToolbarData;

  return (
    <>
      {showShapeToolbar && (
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center w-full pointer-events-none">
          <div className="w-fit px-3 py-2 bg-white-100 border border-black-25 rounded-lg shadow-lg pointer-events-auto">
            <SquareToolBar
              isVisible
              showRadius={shapeToolbarData.element.type !== "ellipse"}
              borderRadius={shapeToolbarData.radius}
              minBorderRadius={shapeToolbarData.minRadius}
              maxBorderRadius={shapeToolbarData.maxRadius}
              color={shapeToolbarData.colorValue}
              borderEnabled={shapeToolbarData.borderEnabled}
              borderColor={shapeToolbarData.borderColor}
              borderWidth={shapeToolbarData.borderWidth}
              borderStyle={shapeToolbarData.borderStyle}
              width={shapeToolbarData.rect.width}
              height={shapeToolbarData.rect.height}
              minWidth={1}
              minHeight={1}
              onBorderRadiusChange={(value: number) =>
                updateSelectedPageElement(
                  shapeToolbarData.element.id,
                  (el) => ({
                    ...el,
                    radius: shapeToolbarData.clampRadius(value),
                  })
                )
              }
              onBorderRadiusStep={(delta: number) =>
                updateSelectedPageElement(
                  shapeToolbarData.element.id,
                  (el) => ({
                    ...el,
                    radius: shapeToolbarData.clampRadius(
                      shapeToolbarData.radius + delta
                    ),
                  })
                )
              }
              onColorChange={(color: string) =>
                updateSelectedPageElement(
                  shapeToolbarData.element.id,
                  (el) => ({ ...el, fill: color })
                )
              }
              onImageUpload={(imageUrl: string) =>
                updateSelectedPageElement(
                  shapeToolbarData.element.id,
                  (el) => ({
                    ...el,
                    fill: imageUrl,
                    imageBox: {
                      x: 0,
                      y: 0,
                      w: shapeToolbarData.rect.width,
                      h: shapeToolbarData.rect.height,
                    },
                  })
                )
              }
              onBorderEnabledChange={(enabled: boolean) =>
                updateSelectedPageElement(
                  shapeToolbarData.element.id,
                  (el) => ({
                    ...el,
                    border: {
                      enabled,
                      color: shapeToolbarData.borderColor,
                      width: shapeToolbarData.borderWidth,
                      style: shapeToolbarData.borderStyle,
                    },
                  })
                )
              }
              onBorderStyleChange={(style: BorderStyle) =>
                updateSelectedPageElement(
                  shapeToolbarData.element.id,
                  (el) => ({
                    ...el,
                    border: {
                      enabled: true,
                      color: shapeToolbarData.borderColor,
                      width: shapeToolbarData.borderWidth,
                      style,
                    },
                  })
                )
              }
              onBorderColorChange={(color: string) =>
                updateSelectedPageElement(
                  shapeToolbarData.element.id,
                  (el) =>
                    ({
                      ...el,
                      border: {
                        ...shapeToolbarData.element.border,
                        color,
                        enabled:
                          shapeToolbarData.element.border?.enabled ?? false,
                      },
                    } as CanvasElement)
                )
              }
              onBorderWidthChange={(value: number) =>
                updateSelectedPageElement(
                  shapeToolbarData.element.id,
                  (el) =>
                    ({
                      ...el,
                      border: {
                        ...shapeToolbarData.element.border,
                        width: value,
                        enabled:
                          shapeToolbarData.element.border?.enabled ?? false,
                      },
                    } as CanvasElement)
                )
              }
              onSizeChange={(width: number, height: number) =>
                updateSelectedPageElement(
                  shapeToolbarData.element.id,
                  (el) => ({
                    ...el,
                    w: width,
                    h: height,
                  })
                )
              }
              onPointerDown={(event) => event.stopPropagation()}
            />
          </div>
        </div>
      )}

      {lineToolbarData && lineToolbarData.element.type === "line" && (
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center w-full pointer-events-none">
          <div className="w-fit px-3 py-2 bg-white-100 border border-black-25 rounded-lg shadow-lg pointer-events-auto">
            <LineToolBar
              isVisible
              color={lineToolbarData.stroke.color}
              width={lineToolbarData.stroke.width}
              onColorChange={(color: string) =>
                updateSelectedPageElement(
                  lineToolbarData.element.id,
                  (el) => ({
                    ...el,
                    stroke: {
                      ...lineToolbarData.stroke,
                      color,
                    },
                  })
                )
              }
              onWidthChange={(width: number) =>
                updateSelectedPageElement(
                  lineToolbarData.element.id,
                  (el) => ({
                    ...el,
                    stroke: {
                      ...lineToolbarData.stroke,
                      width,
                    },
                  })
                )
              }
              onPointerDown={(event) => event.stopPropagation()}
            />
          </div>
        </div>
      )}

      {lineToolbarData && lineToolbarData.element.type === "arrow" && (
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center w-full pointer-events-none">
          <div className="w-fit px-3 py-2 bg-white-100 border border-black-25 rounded-lg shadow-lg pointer-events-auto">
            <ArrowToolBar
              isVisible
              color={lineToolbarData.stroke.color}
              width={lineToolbarData.stroke.width}
              onColorChange={(color: string) =>
                updateSelectedPageElement(
                  lineToolbarData.element.id,
                  (el) => ({
                    ...el,
                    stroke: {
                      ...lineToolbarData.stroke,
                      color,
                    },
                  })
                )
              }
              onWidthChange={(width: number) =>
                updateSelectedPageElement(
                  lineToolbarData.element.id,
                  (el) => ({
                    ...el,
                    stroke: {
                      ...lineToolbarData.stroke,
                      width,
                    },
                  })
                )
              }
              onPointerDown={(event) => event.stopPropagation()}
            />
          </div>
        </div>
      )}

      {aacToolbarData && onAacLabelPositionChange && (
        <div className="absolute top-12 left-0 right-0 z-10 flex items-center justify-center w-full pointer-events-none">
          <div className="w-fit px-3 py-2 bg-white-100 border border-black-25 rounded-lg shadow-lg pointer-events-auto">
            <Suspense fallback={null}>
              <AacToolBar
                isVisible
                labelPosition={aacToolbarData.labelPosition}
                onLabelPositionChange={onAacLabelPositionChange}
                onPointerDown={(event) => event.stopPropagation()}
              />
            </Suspense>
          </div>
        </div>
      )}
    </>
  );
};

export default ElementToolbars;
