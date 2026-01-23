import type { Page } from "../model/pageTypes";

type ActivePageStateParams = {
  pages: Page[];
  selectedPageId: string;
  fallbackOrientation: "horizontal" | "vertical";
};

export const useActivePageState = ({
  pages,
  selectedPageId,
  fallbackOrientation,
}: ActivePageStateParams) => {
  const selectedPage = pages.find((page) => page.id === selectedPageId);
  const activeOrientation = selectedPage?.orientation ?? fallbackOrientation;
  return { selectedPage, activeOrientation };
};
