import {
  PenTool,
  Layout,
  Smile,
  Box,
  Type,
  Upload,
  Grid2X2Icon,
} from "lucide-react";
import { useState } from "react";
import ElementContent from "../components/detail_content/ElementContent";

const SideBar = () => {
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);

  const menuItems = [
    { id: "design", icon: PenTool, label: "디자인" },
    { id: "template", icon: Layout, label: "템플릿" },
    { id: "emotion", icon: Smile, label: "감정" },
    { id: "element", icon: Box, label: "요소" },
    { id: "text", icon: Type, label: "텍스트" },
    { id: "upload", icon: Upload, label: "업로드" },
    { id: "aac", icon: Grid2X2Icon, label: "AAC" },
  ];

  const handleMenuClick = (menuId: string) => {
    if (selectedMenu === menuId) {
      setSelectedMenu(null);
    } else {
      setSelectedMenu(menuId);
    }
  };

  const getMenuTitle = () => {
    const currentMenu = menuItems.find((item) => item.id === selectedMenu);
    return currentMenu?.label || "";
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
              onClick={() => handleMenuClick(item.id)}
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
          <div className="flex-1">
            <ElementContent />
          </div>
        </div>
      )}
    </div>
  );
};

export default SideBar;
