import { Plus } from "lucide-react";
import { Fragment, useState } from "react";
import { useDragAndDrop } from "../model/useDragAndDrop";
import type { Page } from "../model/pageTypes";
import DesignPaper from "./DesignPaper";

interface BottomBarProps {
  pages: Page[];
  selectedPageId: string;
  onAddPage: () => void;
  onSelectPage: (pageId: string) => void;
  onReorderPages: (pages: Page[]) => void;
  onDeletePage: (pageId: string) => void;
  onAddPageAtIndex?: (index: number) => void;
}

const BottomBar = ({
  pages,
  selectedPageId,
  onAddPage,
  onSelectPage,
  onReorderPages,
  onAddPageAtIndex,
}: BottomBarProps) => {
  const { handleDragStart, handleDragOver, handleDrop } = useDragAndDrop({
    pages,
    onReorderPages,
  });
  const MM_TO_PX = 3.7795;
  const mmToPx = (mm: number) => mm * MM_TO_PX;
  const pageWidthPx = mmToPx(210);
  const pageHeightPx = mmToPx(297);
  const previewSize = {
    vertical: { width: 64, height: 90 },
    horizontal: { width: 90, height: 64 },
  };

  const [hoveredDividerIndex, setHoveredDividerIndex] = useState<number | null>(
    null
  );

  const handleAddPageBetween = (index: number) => {
    if (onAddPageAtIndex) {
      onAddPageAtIndex(index);
    }
  };

  return (
    <div className="flex shrink-0 w-full h-32 bg-white border-t border-black-25 items-center px-4">
      {/* 페이지 리스트 + 추가 버튼 - 가로 스크롤 */}
      <div className="flex flex-1 h-full items-start py-2 gap-2 overflow-x-auto overflow-y-hidden">
        {pages.map((page, index) => {
          const isHorizontal = page.orientation === "horizontal";
          const previewBox = isHorizontal
            ? previewSize.horizontal
            : previewSize.vertical;
          const pageSize = {
            width: isHorizontal ? pageHeightPx : pageWidthPx,
            height: isHorizontal ? pageWidthPx : pageHeightPx,
          };
          const previewScale = Math.min(
            previewBox.width / pageSize.width,
            previewBox.height / pageSize.height
          );
          const scaledWidth = pageSize.width * previewScale;
          const scaledHeight = pageSize.height * previewScale;
          return (
          <Fragment key={page.id}>
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, page.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, page.id)}
              className="flex shrink-0 flex-col items-center gap-2 cursor-move"
            >
              <button
                onClick={() => onSelectPage(page.id)}
                className={`relative flex items-center justify-center rounded-lg border-2 transition cursor-pointer overflow-hidden ${
                  isHorizontal ? "w-22.5 h-16" : "w-16 h-22.5"
                } ${
                  selectedPageId === page.id
                    ? "border-primary bg-primary/5"
                    : "border-black-25 bg-white hover:border-black-40"
                }`}
              >
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{ borderRadius: "inherit" }}
                >
                  <div
                    className="relative"
                    style={{
                      width: `${scaledWidth}px`,
                      height: `${scaledHeight}px`,
                    }}
                  >
                    <div
                      style={{
                        width: `${pageSize.width}px`,
                        height: `${pageSize.height}px`,
                        transform: `scale(${previewScale})`,
                        transformOrigin: "top left",
                        pointerEvents: "none",
                      }}
                    >
                      <DesignPaper
                        pageId={page.id}
                        orientation={page.orientation ?? "vertical"}
                        elements={page.elements}
                        selectedIds={[]}
                        editingTextId={null}
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              </button>
              {/* 페이지 번호 */}
              <span className="text-12-medium text-black-60">
                {page.pageNumber}
              </span>
            </div>

            {/* 페이지 사이 호버 시 추가 버튼 (2개 이상일 때만) */}
            {pages.length >= 2 && index < pages.length - 1 && (
              <div
                className="relative flex items-center shrink-0 h-full"
                onMouseEnter={() => setHoveredDividerIndex(index)}
                onMouseLeave={() => setHoveredDividerIndex(null)}
              >
                <div
                  className={`flex items-center justify-center h-full pb-5 transition-all ${
                    hoveredDividerIndex === index ? "w-8" : "w-1"
                  }`}
                >
                  {hoveredDividerIndex === index && (
                    <button
                      onClick={() => handleAddPageBetween(index + 1)}
                      className="flex items-center justify-center w-6 h-6 rounded-full bg-primary hover:bg-primary/90 transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-white" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </Fragment>
          );
        })}

        {/* 페이지 추가 버튼 */}
        <div className="flex shrink-0 flex-col items-center gap-2 ml-2">
          <button
            onClick={onAddPage}
            className="flex flex-col items-center justify-center w-16 h-22.5 rounded-lg border-2 border-dashed border-black-30 hover:border-primary hover:bg-primary/5 transition cursor-pointer"
          >
            <Plus className="w-5 h-5 text-black-60" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BottomBar;
