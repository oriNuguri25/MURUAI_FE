import {
  ArrowRight,
  Circle,
  Table2,
  Minus,
  RectangleHorizontal,
  Square,
} from "lucide-react";

const ElementContent = () => {
  const shapes = [
    { id: 1, name: "사각형", icon: Square },
    { id: 2, name: "둥근 사각형", icon: RectangleHorizontal },
    { id: 3, name: "원", icon: Circle },
    { id: 4, name: "카드", icon: Table2 },
    { id: 5, name: "선", icon: Minus },
    { id: 6, name: "화살표", icon: ArrowRight },
  ];

  return (
    <div className="flex flex-col w-full gap-6">
      <div className="flex items-center text-start">
        <span className="flex text-14-regular text-black-70">
          다양한 요소를 클릭하여 우측 캔버스에 추가해보세요.
        </span>
      </div>

      <div className="flex flex-col w-full gap-3">
        <div className="flex items-center">
          <span className="flex text-title-16-semibold items-center">
            도형 & 선
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {shapes.map((shape) => {
            const Icon = shape.icon;
            return (
              <button
                key={shape.id}
                className="flex flex-col items-center justify-center gap-2 p-4 border border-black-25 rounded-lg hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group"
              >
                <Icon className="icon-m text-black-70 group-hover:text-primary transition-colors" />
                <span className="text-12-semibold text-black-90 group-hover:text-primary transition-colors">
                  {shape.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ElementContent;
