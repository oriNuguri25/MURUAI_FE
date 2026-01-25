import { useElementStore } from "../store/elementStore";

export const useElementContentState = () => {
  const onSelectShape = useElementStore((state) => state.requestElement);
  return { onSelectShape };
};
