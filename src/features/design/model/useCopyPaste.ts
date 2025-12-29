import { useEffect } from "react";
import type { Page } from "../components/BottomBar";

interface UseCopyPasteProps {
  selectedPageId: string;
  pages: Page[];
  onDuplicatePage: (pageId: string) => void;
  onDeletePage: (pageId: string) => void;
}

export const useCopyPaste = ({
  selectedPageId,
  pages,
  onDuplicatePage,
  onDeletePage,
}: UseCopyPasteProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+C 또는 Cmd+C (복사)
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        const selectedPage = pages.find((page) => page.id === selectedPageId);
        if (selectedPage) {
          // 복사할 페이지 ID를 세션 스토리지에 저장
          sessionStorage.setItem("copiedPageId", selectedPage.id);
        }
      }

      // Ctrl+V 또는 Cmd+V (붙여넣기)
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        const copiedPageId = sessionStorage.getItem("copiedPageId");
        if (copiedPageId) {
          e.preventDefault();
          onDuplicatePage(copiedPageId);
        }
      }

      // Backspace 또는 Delete (삭제)
      if (e.key === "Backspace" || e.key === "Delete") {
        // input, textarea 등에서 입력 중일 때는 삭제하지 않음
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }

        if (pages.length > 1) {
          e.preventDefault();
          onDeletePage(selectedPageId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedPageId, pages, onDuplicatePage, onDeletePage]);
};
