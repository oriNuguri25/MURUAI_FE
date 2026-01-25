import MainSection, { type OutletContext } from "@/features/editor/ui/sections/MainSection";
import SideBar from "@/features/editor/ui/sections/SideBar";
import { useOutletContext } from "react-router-dom";

const DesignPage = () => {
  const { loadedDocumentId } = useOutletContext<OutletContext>();
  return (
    <div className="flex h-full w-full overflow-hidden">
      <SideBar />
      <MainSection key={loadedDocumentId ?? "new"} />
    </div>
  );
};

export default DesignPage;
