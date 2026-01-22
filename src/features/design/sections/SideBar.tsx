import {
  PenTool,
  Layout,
  Smile,
  Box,
  Type,
  Upload,
  Grid2X2Icon,
} from "lucide-react";
import UploadContent from "../components/detail_content/UploadContent";
import AACContent from "../components/detail_content/AACContent";
import EmotionContent from "../components/detail_content/EmotionContent";
import ElementContent from "../components/detail_content/ElementContent";
import TextContent from "../components/detail_content/TextContent";
import FontContent from "../components/detail_content/FontContent";
import TemplateContent from "../components/detail_content/TemplateContent";
import DesignContent from "../components/detail_content/DesignContent";
import { useSideBarStore, type SideBarMenu } from "../store/sideBarStore";

const SideBar = () => {
  const selectedMenu = useSideBarStore((state) => state.selectedMenu);
  const toggleMenu = useSideBarStore((state) => state.toggleMenu);

  const menuItems: Array<{
    id: Exclude<SideBarMenu, null | "font">;
    icon: typeof PenTool;
    label: string;
  }> = [
    { id: "design", icon: PenTool, label: "디자인" },
    { id: "template", icon: Layout, label: "템플릿" },
    { id: "emotion", icon: Smile, label: "감정" },
    { id: "element", icon: Box, label: "요소" },
    { id: "text", icon: Type, label: "텍스트" },
    { id: "upload", icon: Upload, label: "업로드" },
    { id: "aac", icon: Grid2X2Icon, label: "AAC" },
  ];

  const getMenuTitle = () => {
    const currentMenu = menuItems.find((item) => item.id === selectedMenu);
    if (currentMenu) return currentMenu.label;
    if (selectedMenu === "font") return "글꼴";
    return "";
  };

  const renderContent = () => {
    switch (selectedMenu) {
      case "design":
        return <DesignContent />;
      case "template":
        return <TemplateContent />;
      case "emotion":
        return <EmotionContent />;
      case "element":
        return <ElementContent />;
      case "text":
        return <TextContent />;
      case "font":
        return <FontContent />;
      case "upload":
        return <UploadContent />;
      case "aac":
        return <AACContent />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full">
      {/* 아이콘 바 */}
      <div className="flex flex-col w-20 h-full px-1 pt-2 border-r border-black-25 gap-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => toggleMenu(item.id)}
              className={`flex flex-col rounded-xl items-center justify-center gap-1 w-full h-16 cursor-pointer transition ${
                selectedMenu === item.id
                  ? "bg-[#5500ff]/20"
                  : "hover:bg-black-10"
              }`}
            >
              <Icon
                className={`w-5 h-5 ${
                  selectedMenu === item.id ? "text-primary" : "text-black-60"
                }`}
              />
              <span
                className={`text-12-medium ${
                  selectedMenu === item.id ? "text-primary" : "text-black-60"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      {/* 상세 옵션 바 */}
      {selectedMenu && (
        <div className="flex flex-col w-82 h-full px-4 py-4 border-r border-black-25 gap-2">
          <div className="text-title-20-semibold text-black-100">
            {getMenuTitle()}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
            {renderContent()}
          </div>
        </div>
      )}
    </div>
  );
};

export default SideBar;
