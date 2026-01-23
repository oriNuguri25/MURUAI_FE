import { useMemo, useState } from "react";
import type { CanvasDocument, Page } from "../model/pageTypes";
import { buildInitialPages } from "../utils/pageFactory";

type InitialPageStateParams = {
  loadedDocument: CanvasDocument | null;
  orientation: "horizontal" | "vertical";
};

export const useInitialPageState = ({
  loadedDocument,
  orientation,
}: InitialPageStateParams) => {
  const initialPages = useMemo(
    () => buildInitialPages(loadedDocument, orientation),
    [loadedDocument, orientation]
  );
  const [pages, setPages] = useState<Page[]>(() => initialPages);
  const [selectedPageId, setSelectedPageId] = useState<string>(
    () => initialPages[0].id
  );

  return { pages, setPages, selectedPageId, setSelectedPageId };
};
