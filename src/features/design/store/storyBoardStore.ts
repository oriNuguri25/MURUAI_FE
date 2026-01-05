import { create } from "zustand";
import type { StorySequenceConfig } from "../utils/storySequenceUtils";

interface StoryBoardStore {
  requestId: number;
  config: StorySequenceConfig | null;
  requestBoard: (config: StorySequenceConfig) => void;
}

export const useStoryBoardStore = create<StoryBoardStore>((set) => ({
  requestId: 0,
  config: null,
  requestBoard: (config) =>
    set((state) => ({
      requestId: state.requestId + 1,
      config,
    })),
}));
