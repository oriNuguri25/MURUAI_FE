import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  GalleryVerticalEnd,
  Grid,
  Grid3x3,
} from "lucide-react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";

// 더미 데이터
const TEMPLATES = [
  { id: 1, title: "감정 표현 카드" },
  { id: 2, title: "일상 루틴 보드" },
  { id: 3, title: "선택 활동판" },
  { id: 4, title: "날씨 이야기" },
  { id: 5, title: "음식 메뉴판" },
  { id: 6, title: "학습 계획표" },
];

// 공통 컴포넌트
const SectionHeader = ({
  icon: Icon,
  iconColor,
  title,
}: {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
}) => (
  <div className="flex items-center gap-2">
    <Icon className={`icon-s items-center ${iconColor || "text-primary"}`} />
    <span className="flex text-title-16-semibold items-center">{title}</span>
  </div>
);

const TemplateCard = ({
  icon: Icon,
  iconBgColor,
  borderColor,
  bgColor,
  hoverBgColor,
  title,
  description,
}: {
  icon: LucideIcon;
  iconBgColor: string;
  borderColor: string;
  bgColor: string;
  hoverBgColor: string;
  title: string;
  description: string;
}) => (
  <div
    className="flex items-center gap-3 w-full border rounded-xl px-4 py-3.5 transition-colors cursor-pointer"
    style={{
      borderColor,
      backgroundColor: bgColor,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = hoverBgColor;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = bgColor;
    }}
  >
    <div
      className="flex w-12 h-12 items-center justify-center rounded-lg shadow-sm"
      style={{ backgroundColor: iconBgColor }}
    >
      <Icon className="icon-m text-white" />
    </div>

    <div className="flex flex-col justify-center gap-1">
      <span className="text-title-18-semibold text-black-100">{title}</span>
      <span className="text-12-regular text-black-60">{description}</span>
    </div>
  </div>
);

const CarouselButton = ({
  onClick,
  direction,
  label,
}: {
  onClick: () => void;
  direction: "left" | "right";
  label: string;
}) => (
  <button
    onClick={onClick}
    className={`absolute ${
      direction === "left" ? "left-2" : "right-2"
    } top-[calc(50%-1rem)] -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-white-100/90 hover:bg-white-100 shadow-md transition-all`}
    aria-label={label}
  >
    {direction === "left" ? (
      <ChevronLeft className="icon-xs text-black-90" />
    ) : (
      <ChevronRight className="icon-xs text-black-90" />
    )}
  </button>
);

const PageIndicator = ({
  totalPages,
  currentPage,
  onPageChange,
}: {
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}) => (
  <div className="flex items-center justify-center gap-2 mt-2">
    {Array.from({ length: totalPages }).map((_, index) => (
      <button
        key={index}
        onClick={() => onPageChange(index)}
        className={`w-2 h-2 rounded-full transition-all ${
          index === currentPage
            ? "bg-primary w-6"
            : "bg-black-30 hover:bg-black-40"
        }`}
        aria-label={`${index + 1}페이지로 이동`}
      />
    ))}
  </div>
);

const PopularTemplates = () => {
  const [currentPage, setCurrentPage] = useState(0);

  const itemsPerPage = 2;
  const totalPages = Math.ceil(TEMPLATES.length / itemsPerPage);
  const currentTemplates = TEMPLATES.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const handlePrev = () => {
    setCurrentPage((prev) => (prev > 0 ? prev - 1 : totalPages - 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => (prev < totalPages - 1 ? prev + 1 : 0));
  };

  return (
    <div className="flex flex-col w-full gap-3">
      <SectionHeader icon={BadgeCheck} iconColor="text-blue-500" title="인기 템플릿" />

      <div className="relative w-full group">
        <div className="flex gap-4 w-full overflow-hidden">
          {currentTemplates.map((template) => (
            <div
              key={template.id}
              className="flex flex-col w-full gap-2 cursor-pointer"
            >
              <div className="w-full aspect-[1/1.414] bg-white-100 border border-black-25 rounded-lg shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute inset-0 bg-black-5 flex items-center justify-center">
                  <span className="text-14-medium text-black-50">
                    {template.title}
                  </span>
                </div>
              </div>

              <span className="text-14-semibold text-black-90 text-center hover:text-primary transition-colors">
                {template.title}
              </span>
            </div>
          ))}
        </div>

        <CarouselButton onClick={handlePrev} direction="left" label="이전 템플릿" />
        <CarouselButton onClick={handleNext} direction="right" label="다음 템플릿" />
      </div>

      <PageIndicator
        totalPages={totalPages}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

// 메인 컴포넌트
const TemplateContent = () => {
  return (
    <div className="flex flex-col w-full gap-6">
      <div className="flex flex-col w-full gap-3">
        <SectionHeader icon={Grid3x3} title="AAC 의사소통 판" />
        <TemplateCard
          icon={Grid}
          iconBgColor="#5500ff"
          borderColor="rgba(85, 0, 255, 0.2)"
          bgColor="rgba(85, 0, 255, 0.05)"
          hoverBgColor="rgba(85, 0, 255, 0.08)"
          title="AAC 의사소통 판"
          description="1~8 그리드, 가로/세로 방향 선택"
        />
      </div>

      <div className="flex flex-col w-full gap-3">
        <SectionHeader
          icon={GalleryVerticalEnd}
          iconColor="text-[#0EA5E9]"
          title="이야기 장면 순서 맞추기"
        />
        <TemplateCard
          icon={GalleryVerticalEnd}
          iconBgColor="#0EA5E9"
          borderColor="rgba(14, 165, 233, 0.2)"
          bgColor="rgba(14, 165, 233, 0.05)"
          hoverBgColor="rgba(14, 165, 233, 0.08)"
          title="이야기 장면 순서 맞추기"
          description="2~8개 카드, 순서 화살표 자동 생성"
        />
      </div>

      <PopularTemplates />
    </div>
  );
};

export default TemplateContent;
