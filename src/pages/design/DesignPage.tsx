import MainSection from "@/features/design/sections/MainSection";
import SideBar from "@/features/design/sections/SideBar";

const DesignPage = () => {
  return (
    <div className="flex h-full w-full overflow-hidden">
      <SideBar />
      <MainSection />
    </div>
  );
};

export default DesignPage;
