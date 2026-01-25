import {
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Copy,
  Plus,
  Trash2,
} from "lucide-react";
import { Fragment, useRef, useState } from "react";
import { useDragAndDrop } from "../../model/useDragAndDrop";
import type { Page } from "../../model/pageTypes";
import DesignPaper from "./DesignPaper";

interface BottomBarProps {
  pages: Page[];
  selectedPageId: string;
  onAddPage: () => void;
  onSelectPage: (pageId: string) => void;
  onCopyPage: (pageId: string) => void;
  onPastePage: (pageId: string) => void;
  onReorderPages: (pages: Page[]) => void;
  onDeletePage: (pageId: string) => void;
  onAddPageAtIndex?: (index: number) => void;
  onMovePage?: (pageId: string, direction: "left" | "right") => void;
  onDuplicatePage?: (pageId: string) => void;
}

const BottomBar = ({
  pages,
  selectedPageId,
  onAddPage,
  onSelectPage,
  onCopyPage,
  onPastePage,
  onReorderPages,
  onDeletePage,
  onAddPageAtIndex,
  onMovePage,
  onDuplicatePage,
}: BottomBarProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
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
    null,
  );
  const [hoveredPageId, setHoveredPageId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    pageId: string;
    x: number;
    y: number;
  } | null>(null);

  const getCopiedPageId = () => {
    try {
      return sessionStorage.getItem("copiedPageId");
    } catch {
      return null;
    }
  };

  const handleAddPageBetween = (index: number) => {
    if (onAddPageAtIndex) {
      onAddPageAtIndex(index);
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="relative flex shrink-0 w-full h-36 bg-white border-t border-black-25 items-center pt-3 px-4 outline-none"
      onPointerDown={() => setContextMenu(null)}
      onContextMenu={(event) => event.preventDefault()}
    >
      {/* 페이지 리스트 + 추가 버튼 - 가로 스크롤 */}
      <div className="flex flex-1 h-full items-start pt-1 pb-3 gap-2 overflow-x-auto overflow-y-hidden">
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
            previewBox.height / pageSize.height,
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
                onMouseEnter={() => setHoveredPageId(page.id)}
                onMouseLeave={() => setHoveredPageId(null)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onSelectPage(page.id);
                  const rect = containerRef.current?.getBoundingClientRect();
                  const rawX = event.clientX - (rect?.left ?? 0);
                  const rawY = event.clientY - (rect?.top ?? 0);
                  const menuWidth = 160;
                  const menuHeight = 3 * 36 + 8;
                  const maxX = (rect?.width ?? 0) - menuWidth - 8;
                  const maxY = (rect?.height ?? 0) - menuHeight - 8;
                  const clampedX = Math.min(
                    Math.max(rawX, 8),
                    Math.max(8, maxX),
                  );
                  const clampedY = Math.min(
                    Math.max(rawY, 8),
                    Math.max(8, maxY),
                  );
                  setContextMenu({ pageId: page.id, x: clampedX, y: clampedY });
                }}
                className="flex shrink-0 flex-col items-center gap-1 cursor-move"
              >
                <div className="relative">
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
                    {/* 페이지 번호 - 썸네일 하단 우측 */}
                    <span
                      className="absolute bottom-1 right-1 text-black-50 bg-white/80 px-1 rounded"
                      style={{ fontSize: "10px", fontWeight: 500 }}
                    >
                      {page.pageNumber}
                    </span>
                  </button>
                  {/* 좌우 이동 버튼 */}
                  {hoveredPageId === page.id && pages.length > 1 && (
                    <>
                      {index > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMovePage?.(page.id, "left");
                          }}
                          className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full bg-black-70 hover:bg-black-90 transition"
                        >
                          <ChevronLeft className="w-3 h-3 text-white" />
                        </button>
                      )}
                      {index < pages.length - 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMovePage?.(page.id, "right");
                          }}
                          className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full bg-black-70 hover:bg-black-90 transition"
                        >
                          <ChevronRight className="w-3 h-3 text-white" />
                        </button>
                      )}
                    </>
                  )}
                </div>
                {/* 호버 시 복제/삭제 버튼, 아닐 때 빈 공간 유지 */}
                <div className="flex items-center justify-center gap-1 h-5">
                  {hoveredPageId === page.id ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicatePage?.(page.id);
                        }}
                        className="flex items-center justify-center w-5 h-5 rounded bg-black-10 hover:bg-black-20 transition"
                        title="복제"
                      >
                        <Copy className="w-3 h-3 text-black-60" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePage(page.id);
                        }}
                        className="flex items-center justify-center w-5 h-5 rounded bg-black-10 hover:bg-red-100 hover:text-white transition"
                        title="삭제"
                      >
                        <Trash2 className="w-3 h-3 text-black-60 hover:text-white" />
                      </button>
                    </>
                  ) : null}
                </div>
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
      {contextMenu && (
        <div
          className="absolute z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="w-40 rounded-lg border border-black-25 bg-white-100 py-1 shadow-lg">
            <button
              type="button"
              onClick={() => {
                onCopyPage(contextMenu.pageId);
                setContextMenu(null);
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-14-regular text-black-90 hover:bg-black-5"
            >
              <span className="flex items-center gap-2">
                <Copy className="h-4 w-4" />
                복사
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                onPastePage(contextMenu.pageId);
                setContextMenu(null);
              }}
              disabled={!getCopiedPageId()}
              className={`flex w-full items-center justify-between px-3 py-2 text-14-regular ${
                getCopiedPageId()
                  ? "text-black-90 hover:bg-black-5"
                  : "text-black-40"
              }`}
            >
              <span className="flex items-center gap-2">
                <Clipboard className="h-4 w-4" />
                붙여넣기
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                onDeletePage(contextMenu.pageId);
                setContextMenu(null);
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-14-regular text-black-90 hover:bg-black-5"
            >
              <span className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                삭제
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BottomBar;
