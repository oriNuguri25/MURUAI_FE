import {
  useEffect,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useAacBoardStore } from "../store/aacBoardStore";
import { useStoryBoardStore } from "../store/storyBoardStore";
import type { SideBarMenu } from "../store/sideBarStore";
import type { Page } from "../model/pageTypes";
import type { AacBoardConfig } from "../utils/aacBoardUtils";
import type { StorySequenceConfig } from "../utils/storySequenceUtils";

type AddAacBoardPage = (args: {
  config: AacBoardConfig;
  setPages: Dispatch<SetStateAction<Page[]>>;
}) => { id: string; orientation: "horizontal" | "vertical"; firstElementId?: string };

type AddStoryBoardPage = (args: {
  config: StorySequenceConfig;
  setPages: Dispatch<SetStateAction<Page[]>>;
}) => { id: string; orientation: "horizontal" | "vertical" };

type BoardSubscriptionsParams = {
  setPages: Dispatch<SetStateAction<Page[]>>;
  setActivePage: (
    pageId: string,
    nextOrientation?: "horizontal" | "vertical"
  ) => void;
  setSideBarMenu: (menu: SideBarMenu) => void;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  setEditingTextId: Dispatch<SetStateAction<string | null>>;
  addAacBoardPage: AddAacBoardPage;
  addStoryBoardPage: AddStoryBoardPage;
};

export const useBoardSubscriptions = ({
  setPages,
  setActivePage,
  setSideBarMenu,
  setSelectedIds,
  setEditingTextId,
  addAacBoardPage,
  addStoryBoardPage,
}: BoardSubscriptionsParams) => {
  useEffect(() => {
    const unsubscribe = useAacBoardStore.subscribe((state, prevState) => {
      if (state.requestId === prevState.requestId) return;
      if (!state.config) return;
      const newPage = addAacBoardPage({
        config: state.config,
        setPages,
      });
      setActivePage(newPage.id, newPage.orientation);
      setSideBarMenu("aac");
      if (newPage.firstElementId) {
        setSelectedIds([newPage.firstElementId]);
        setEditingTextId(null);
      }
    });
    return unsubscribe;
  }, [
    addAacBoardPage,
    setActivePage,
    setEditingTextId,
    setPages,
    setSelectedIds,
    setSideBarMenu,
  ]);

  useEffect(() => {
    const unsubscribe = useStoryBoardStore.subscribe((state, prevState) => {
      if (state.requestId === prevState.requestId) return;
      if (!state.config) return;
      const newPage = addStoryBoardPage({
        config: state.config,
        setPages,
      });
      setActivePage(newPage.id, newPage.orientation);
    });
    return unsubscribe;
  }, [addStoryBoardPage, setActivePage, setPages]);
};
