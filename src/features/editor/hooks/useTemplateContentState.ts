import { useTemplateStore } from "../store/templateStore";
import { useAacBoardStore } from "../store/aacBoardStore";
import { useStoryBoardStore } from "../store/storyBoardStore";

export const useTemplateContentState = () => {
  const requestTemplate = useTemplateStore((state) => state.requestTemplate);
  const requestAacBoard = useAacBoardStore((state) => state.requestBoard);
  const requestStoryBoard = useStoryBoardStore((state) => state.requestBoard);

  return {
    requestTemplate,
    requestAacBoard,
    requestStoryBoard,
  };
};
