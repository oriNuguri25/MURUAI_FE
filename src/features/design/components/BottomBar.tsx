import { Plus } from "lucide-react";
import { useDragAndDrop } from "../model/useDragAndDrop";

export interface Page {
  id: string;
  thumbnail: string;
  pageNumber: number;
}

interface BottomBarProps {
  pages: Page[];
  selectedPageId: string;
  onAddPage: () => void;
  onSelectPage: (pageId: string) => void;
  onReorderPages: (pages: Page[]) => void;
  onDeletePage: (pageId: string) => void;
}

const BottomBar = ({
  pages,
  selectedPageId,
  onAddPage,
  onSelectPage,
  onReorderPages,
}: BottomBarProps) => {
  const { handleDragStart, handleDragOver, handleDrop } = useDragAndDrop({
    pages,
    onReorderPages,
  });

  return (
    <div className="flex shrink-0 w-full h-32 bg-white border-t border-black-25 items-center px-4">
      {/* 페이지 리스트 + 추가 버튼 - 가로 스크롤 */}
      <div className="flex flex-1 h-full items-start py-2 gap-4 overflow-x-auto overflow-y-hidden">
        {pages.map((page) => (
          <div
            key={page.id}
            draggable
            onDragStart={(e) => handleDragStart(e, page.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, page.id)}
            className="flex shrink-0 flex-col items-center gap-2 cursor-move"
          >
            <div className="relative">
              <button
                onClick={() => onSelectPage(page.id)}
                className={`flex items-center justify-center w-16 h-22.5 rounded-lg border-2 transition cursor-pointer ${
                  selectedPageId === page.id
                    ? "border-primary bg-primary/5"
                    : "border-black-25 bg-white hover:border-black-40"
                }`}
              ></button>
            </div>
            {/* 페이지 번호 */}
            <span className="text-12-medium text-black-60">
              {page.pageNumber}
            </span>
          </div>
        ))}

        {/* 페이지 추가 버튼 */}
        <div className="flex shrink-0 flex-col items-center gap-2">
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
