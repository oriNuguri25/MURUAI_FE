import { useElementStore } from "../store/elementStore";

export const useTextContentState = () => {
  const onSelectPreset = useElementStore((state) => state.requestText);
  return { onSelectPreset };
};
