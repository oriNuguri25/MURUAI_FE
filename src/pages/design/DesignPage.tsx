import MainSection, { type OutletContext } from "@/features/design/sections/MainSection";
import SideBar from "@/features/design/sections/SideBar";
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
