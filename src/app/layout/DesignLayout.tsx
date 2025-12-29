import {
  Home,
  Save,
  Undo,
  Redo,
  Monitor,
  Smartphone,
  Printer,
  Download,
  Plus,
  Minus,
  RotateCcw,
} from "lucide-react";
import { Outlet } from "react-router-dom";
import { useState } from "react";

const DesignLayout = () => {
  const [orientation, setOrientation] = useState<"horizontal" | "vertical">(
    "horizontal"
  );
  const [zoom, setZoom] = useState<number>(100);

  const handleZoomIn = () => {
    if (zoom < 200) {
      setZoom(zoom + 10);
    }
  };

  const handleZoomOut = () => {
    if (zoom > 10) {
      setZoom(zoom - 10);
    }
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <header className="shrink-0 flex w-full h-14 px-3 items-center justify-center border-b border-b-black-25">
        <div className="flex w-full h-12 items-center justify-between">
          {/* 좌측 */}
          <div className="flex h-full items-center gap-2">
            <button
              onClick={() => window.open("/", "_blank")}
              className="flex h-full items-center justify-center px-3 cursor-pointer"
            >
              <Home className="h-8 w-8 text-primary" />
            </button>

            <div className="flex px-3 h-full items-center justify-center">
              <input
                placeholder="제목을 입력해주세요"
                className="flex w-72 h-10 border border-transparent rounded-xl px-2 placeholder:text-black-50 focus:border-[#5500ff] focus:outline-none text-ellipsis overflow-hidden whitespace-nowrap"
              />
            </div>

            <div className="flex h-full items-center justify-center pr-3">
              <div className="flex h-10 w-10 rounded-xl items-center justify-center bg-black-20">
                <Save className="w-6 h-6 text-black-60" />
              </div>
            </div>

            <div className="h-8 w-px bg-black-25" />

            <div className="flex h-full items-center justify-center gap-2">
              <button
                type="button"
                className="flex h-10 w-10 rounded-xl items-center justify-center hover:bg-black-20 transition cursor-pointer"
                aria-label="뒤로가기"
              >
                <Undo className="w-5 h-5 text-black-60" />
              </button>
              <button
                type="button"
                className="flex h-10 w-10 rounded-xl items-center justify-center hover:bg-black-20 transition cursor-pointer"
                aria-label="앞으로가기"
              >
                <Redo className="w-5 h-5 text-black-60" />
              </button>
            </div>

            <div className="h-8 w-px bg-black-25" />

            <div className="flex h-full items-center justify-center px-3">
              <div className="flex h-10 rounded-xl bg-black-10 p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setOrientation("horizontal")}
                  className={`flex h-8 px-3 rounded-lg items-center justify-center gap-1.5 transition cursor-pointer ${
                    orientation === "horizontal"
                      ? "bg-white-100 shadow-sm"
                      : "hover:bg-black-20"
                  }`}
                  aria-label="가로 모드"
                >
                  <Monitor
                    className={`w-4 h-4 ${
                      orientation === "horizontal"
                        ? "text-primary"
                        : "text-black-60"
                    }`}
                  />
                  <span
                    className={`text-12-medium ${
                      orientation === "horizontal"
                        ? "text-primary"
                        : "text-black-60"
                    }`}
                  >
                    가로
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation("vertical")}
                  className={`flex h-8 px-3 rounded-lg items-center justify-center gap-1.5 transition cursor-pointer ${
                    orientation === "vertical"
                      ? "bg-white-100 shadow-sm"
                      : "hover:bg-black-20"
                  }`}
                  aria-label="세로 모드"
                >
                  <Smartphone
                    className={`w-4 h-4 ${
                      orientation === "vertical"
                        ? "text-primary"
                        : "text-black-60"
                    }`}
                  />
                  <span
                    className={`text-12-medium ${
                      orientation === "vertical"
                        ? "text-primary"
                        : "text-black-60"
                    }`}
                  >
                    세로
                  </span>
                </button>
              </div>
            </div>

            <div className="flex h-full items-center justify-center gap-2 px-3">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 10}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-black-10 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="축소"
              >
                <Minus className="w-4 h-4 text-black-60" />
              </button>
              <span className="text-14-medium text-black-80 min-w-12 text-center">
                {zoom}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 200}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-black-10 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="확대"
              >
                <Plus className="w-4 h-4 text-black-60" />
              </button>
              <button
                onClick={handleResetZoom}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-black-10 transition cursor-pointer"
                aria-label="원래 크기로"
              >
                <RotateCcw className="w-4 h-4 text-black-60" />
              </button>
            </div>
          </div>

          <div className="flex h-full items-center gap-3 pr-3">
            <div className="flex h-full items-center justify-center">
              <div className="flex h-10 w-10 rounded-xl items-center justify-center bg-black-20">
                <Printer className="w-6 h-6 text-black-60" />
              </div>
            </div>

            <button className="flex gap-2 h-10 rounded-xl items-center justify-center px-3 bg-primary cursor-pointer">
              <Download className="w-5 h-5 text-white-100" />
              <span className="flex text-14-semibold text-white">내보내기</span>
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        <Outlet context={{ zoom, orientation }} />
      </main>
    </div>
  );
};

export default DesignLayout;
