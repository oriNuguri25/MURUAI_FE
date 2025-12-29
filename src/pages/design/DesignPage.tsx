import MainSection from "@/features/design/sections/MainSection";
import OptionBar from "@/features/design/sections/OptionBar";
import SideBar from "@/features/design/sections/SideBar";

const DesignPage = () => {
  return (
    <div className="flex h-full w-full overflow-hidden">
      <SideBar />
      <MainSection />
      <OptionBar />
    </div>
  );
};

export default DesignPage;
