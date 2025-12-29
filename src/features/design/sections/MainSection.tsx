import { useState, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import BottomBar, { type Page } from "../components/BottomBar";
import DesignPaper from "../components/DesignPaper";
import { useCopyPaste } from "../model/useCopyPaste";
import { useCanvasZoom } from "../model/useCanvasZoom";

interface OutletContext {
  zoom: number;
  orientation: "horizontal" | "vertical";
}

const MainSection = () => {
  const { zoom, orientation } = useOutletContext<OutletContext>();
  const [pages, setPages] = useState<Page[]>([
    { id: "1", thumbnail: "", pageNumber: 1 },
  ]);
  const [selectedPageId, setSelectedPageId] = useState<string>("1");

  const handleAddPage = () => {
    const newPageNumber = pages.length + 1;
    const newPage: Page = {
      id: Date.now().toString(),
      thumbnail: "",
      pageNumber: newPageNumber,
    };
    setPages([...pages, newPage]);
    setSelectedPageId(newPage.id);
  };

  const handleSelectPage = (pageId: string) => {
    setSelectedPageId(pageId);
  };

  const handleReorderPages = (reorderedPages: Page[]) => {
    setPages(reorderedPages);
  };

  const handleDuplicatePage = (pageId: string) => {
    const pageToDuplicate = pages.find((page) => page.id === pageId);
    if (!pageToDuplicate) return;

    const pageIndex = pages.findIndex((page) => page.id === pageId);
    const newPage: Page = {
      id: Date.now().toString(),
      thumbnail: pageToDuplicate.thumbnail,
      pageNumber: pageIndex + 2, // 임시 번호
    };

    // 복사된 페이지를 원본 페이지 바로 다음에 삽입
    const newPages = [...pages];
    newPages.splice(pageIndex + 1, 0, newPage);

    // 페이지 번호 재정렬
    const reorderedPages = newPages.map((page, index) => ({
      ...page,
      pageNumber: index + 1,
    }));

    setPages(reorderedPages);
    setSelectedPageId(newPage.id);
  };

  const handleDeletePage = (pageId: string) => {
    if (pages.length <= 1) return;

    const updatedPages = pages
      .filter((page) => page.id !== pageId)
      .map((page, index) => ({
        ...page,
        pageNumber: index + 1,
      }));

    setPages(updatedPages);

    // 삭제된 페이지가 선택되어 있었다면 첫 번째 페이지 선택
    if (selectedPageId === pageId) {
      setSelectedPageId(updatedPages[0].id);
    }
  };

  // 복사/붙여넣기/삭제 기능 활성화
  useCopyPaste({
    selectedPageId,
    pages,
    onDuplicatePage: handleDuplicatePage,
    onDeletePage: handleDeletePage,
  });

  const selectedPage = pages.find((page) => page.id === selectedPageId);
  const containerRef = useRef<HTMLDivElement>(null);

  // Canvas 확대/축소 훅 사용
  const { canvasRef, scale, padding, paperWidth, paperHeight } = useCanvasZoom({
    zoom,
    pageId: selectedPageId,
    containerRef,
    orientation,
  });

  return (
    <div className="flex flex-col w-full h-full overflow-hidden bg-black-20">
      <div
        ref={containerRef}
        className="flex-1 w-full min-h-0 overflow-auto"
        style={{ padding: "10px" }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "100%",
            minHeight: "100%",
          }}
        >
          <div style={{ position: "relative" }}>
            <canvas
              ref={canvasRef}
              style={{
                display: "block",
                imageRendering: "crisp-edges"
              }}
            />
            {/* DesignPaper를 Canvas 위에 오버레이로 배치 */}
            <div
              style={{
                position: "absolute",
                top: `${padding}px`,
                left: `${padding}px`,
                width: `${paperWidth}px`,
                height: `${paperHeight}px`,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                pointerEvents: "all",
              }}
            >
              {selectedPage && <DesignPaper pageId={selectedPage.id} orientation={orientation} />}
            </div>
          </div>
        </div>
      </div>
      <BottomBar
        pages={pages}
        selectedPageId={selectedPageId}
        onAddPage={handleAddPage}
        onSelectPage={handleSelectPage}
        onReorderPages={handleReorderPages}
        onDeletePage={handleDeletePage}
      />
    </div>
  );
};

export default MainSection;
