import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  GalleryVerticalEnd,
  Grid,
  Grid3x3,
  X,
} from "lucide-react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useTemplateStore } from "../../store/templateStore";
import {
  TEMPLATE_REGISTRY,
  type TemplateId,
} from "../../templates/templateRegistry";
import type {
  CanvasElement,
  Template,
  TemplateElement,
} from "../../model/canvasTypes";
import DesignPaper from "../DesignPaper";
import { useAacBoardStore } from "../../store/aacBoardStore";
import { useStoryBoardStore } from "../../store/storyBoardStore";
import {
  buildAacBoardElements,
  type AacLabelPosition,
} from "../../utils/aacBoardUtils";
import { withLogoTemplateElements } from "../../utils/logoElement";
import {
  buildStorySequenceElements,
  type StoryDirection,
  type StoryCardRatio,
} from "../../utils/storySequenceUtils";

const TEMPLATES = Object.values(TEMPLATE_REGISTRY).map((template) => ({
  id: template.id,
  title: template.label,
}));

const addElementId = (element: TemplateElement, id: string): CanvasElement => ({
  ...(element as CanvasElement),
  id,
});

const toPreviewElements = (template: Template): CanvasElement[] =>
  template.elements.map((element, index) =>
    addElementId(element, `${template.id}-${index}`)
  );

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
  onClick,
}: {
  icon: LucideIcon;
  iconBgColor: string;
  borderColor: string;
  bgColor: string;
  hoverBgColor: string;
  title: string;
  description: string;
  onClick?: () => void;
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
    onClick={onClick}
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
  const requestTemplate = useTemplateStore((state) => state.requestTemplate);

  const itemsPerPage = 2;
  const totalPages = Math.ceil(TEMPLATES.length / itemsPerPage);
  const currentTemplates = TEMPLATES.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );
  const displayTemplates: Array<(typeof TEMPLATES)[number] | null> = [
    ...currentTemplates,
  ];
  while (displayTemplates.length < itemsPerPage) {
    displayTemplates.push(null);
  }

  const handlePrev = () => {
    setCurrentPage((prev) => (prev > 0 ? prev - 1 : totalPages - 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => (prev < totalPages - 1 ? prev + 1 : 0));
  };

  const handleTemplateClick = (templateId: string | number) => {
    if (typeof templateId === "string" && templateId in TEMPLATE_REGISTRY) {
      requestTemplate(templateId as TemplateId);
    }
  };

  return (
    <div className="flex flex-col w-full gap-3">
      <SectionHeader
        icon={BadgeCheck}
        iconColor="text-blue-500"
        title="인기 템플릿"
      />

      <div className="relative w-full group">
        <div className="grid w-full grid-cols-2 gap-4">
          {displayTemplates.map((template, index) => {
            if (!template) {
              return (
                <div
                  key={`empty-${index}`}
                  className="flex flex-col w-full gap-2 opacity-0 pointer-events-none"
                >
                  <div className="w-full aspect-[1/1.414] border border-transparent" />
                  <span className="text-14-semibold">placeholder</span>
                </div>
              );
            }
            const templateData =
              typeof template.id === "string"
                ? TEMPLATE_REGISTRY[template.id as TemplateId]
                : null;
            const pageWidthPx = 210 * 3.7795;
            const pageHeightPx = 297 * 3.7795;
            const previewScale = 0.18;
            const scaledWidth = pageWidthPx * previewScale;
            const scaledHeight = pageHeightPx * previewScale;

            return (
              <div
                key={template.id}
                className="flex flex-col w-full gap-2 cursor-pointer"
                onClick={() => handleTemplateClick(template.id)}
              >
                <div className="w-full aspect-[1/1.414] bg-white-100 border border-black-25 rounded-lg shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                  {templateData ? (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div
                        style={{
                          width: `${scaledWidth}px`,
                          height: `${scaledHeight}px`,
                        }}
                      >
                        <div
                          style={{
                            width: `${pageWidthPx}px`,
                            height: `${pageHeightPx}px`,
                            transform: `scale(${previewScale})`,
                            transformOrigin: "top left",
                          }}
                        >
                          <DesignPaper
                            pageId={`preview-${templateData.id}`}
                            orientation="vertical"
                            elements={toPreviewElements(templateData.template)}
                            selectedIds={[]}
                            editingTextId={null}
                            readOnly
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-black-5 flex items-center justify-center">
                      <span className="text-14-medium text-black-50">
                        {template.title}
                      </span>
                    </div>
                  )}
                </div>

                <span className="text-14-semibold text-black-90 text-center hover:text-primary transition-colors">
                  {template.title}
                </span>
              </div>
            );
          })}
        </div>

        <CarouselButton
          onClick={handlePrev}
          direction="left"
          label="이전 템플릿"
        />
        <CarouselButton
          onClick={handleNext}
          direction="right"
          label="다음 템플릿"
        />
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
  const [isAacModalOpen, setIsAacModalOpen] = useState(false);
  const [aacRows, setAacRows] = useState(3);
  const [aacColumns, setAacColumns] = useState(3);
  const [aacOrientation, setAacOrientation] = useState<
    "vertical" | "horizontal"
  >("vertical");
  const [aacLabelPosition, setAacLabelPosition] =
    useState<AacLabelPosition>("bottom");
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [storyCount, setStoryCount] = useState(4);
  const [storyDirection, setStoryDirection] =
    useState<StoryDirection>("left-to-right");
  const [storyOrientation, setStoryOrientation] = useState<
    "vertical" | "horizontal"
  >("vertical");
  const [storyRatio, setStoryRatio] = useState<StoryCardRatio>("4:3");
  const requestAacBoard = useAacBoardStore((state) => state.requestBoard);
  const requestStoryBoard = useStoryBoardStore((state) => state.requestBoard);
  const previewElements = withLogoTemplateElements(
    buildAacBoardElements({
      rows: aacRows,
      columns: aacColumns,
      orientation: aacOrientation,
      labelPosition: aacLabelPosition,
    })
  ).map((element, index) => ({
    ...(element as CanvasElement),
    id: `aac-preview-${index}`,
  }));
  const pageWidthPx = 210 * 3.7795;
  const pageHeightPx = 297 * 3.7795;
  const previewBaseWidth =
    aacOrientation === "horizontal" ? pageHeightPx : pageWidthPx;
  const previewBaseHeight =
    aacOrientation === "horizontal" ? pageWidthPx : pageHeightPx;
  const previewBoxWidth = 240;
  const previewBoxHeight = 180;
  const previewScale = Math.min(
    previewBoxWidth / previewBaseWidth,
    previewBoxHeight / previewBaseHeight
  );
  const previewScaledWidth = previewBaseWidth * previewScale;
  const previewScaledHeight = previewBaseHeight * previewScale;
  const storyPreviewElements = withLogoTemplateElements(
    buildStorySequenceElements({
      count: storyCount,
      direction: storyDirection,
      orientation: storyOrientation,
      ratio: storyRatio,
    })
  ).map((element, index) => ({
    ...(element as CanvasElement),
    id: `story-preview-${index}`,
  }));
  const storyPreviewBaseWidth =
    storyOrientation === "horizontal" ? pageHeightPx : pageWidthPx;
  const storyPreviewBaseHeight =
    storyOrientation === "horizontal" ? pageWidthPx : pageHeightPx;
  const storyPreviewScale = Math.min(
    previewBoxWidth / storyPreviewBaseWidth,
    previewBoxHeight / storyPreviewBaseHeight
  );
  const storyPreviewScaledWidth = storyPreviewBaseWidth * storyPreviewScale;
  const storyPreviewScaledHeight = storyPreviewBaseHeight * storyPreviewScale;
  const handleCountChange = (value: string, setter: (next: number) => void) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    if (parsed >= 1 && parsed <= 5) {
      setter(parsed);
    }
  };
  const handleApplyAacBoard = () => {
    requestAacBoard({
      rows: aacRows,
      columns: aacColumns,
      orientation: aacOrientation,
      labelPosition: aacLabelPosition,
    });
    setIsAacModalOpen(false);
  };
  const handleStoryCountChange = (value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    if (parsed >= 1 && parsed <= 8) {
      setStoryCount(parsed);
    }
  };
  const handleApplyStoryBoard = () => {
    requestStoryBoard({
      count: storyCount,
      direction: storyDirection,
      orientation: storyOrientation,
      ratio: storyRatio,
    });
    setIsStoryModalOpen(false);
  };

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
          onClick={() => setIsAacModalOpen(true)}
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
          onClick={() => setIsStoryModalOpen(true)}
        />
      </div>

      <PopularTemplates />
      {isAacModalOpen && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black-90/30"
            onClick={() => setIsAacModalOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white-100 p-6 shadow-xl">
            <button
              type="button"
              onClick={() => setIsAacModalOpen(false)}
              className="absolute right-5 top-5 rounded-lg p-1 text-black-60 transition hover:bg-black-10 hover:text-black-100"
              aria-label="닫기"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mb-6">
              <h2 className="text-title-20-semibold text-black-100">
                AAC 의사소통 판 설정
              </h2>
            </div>
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <span className="text-14-semibold text-black-90">판 개수</span>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={aacRows}
                    onChange={(event) =>
                      handleCountChange(event.target.value, setAacRows)
                    }
                    className="w-16 rounded-lg border border-black-25 px-3 py-2 text-center text-14-regular text-black-90"
                    min={1}
                    max={5}
                  />
                  <span className="text-14-regular text-black-70">X</span>
                  <input
                    type="number"
                    value={aacColumns}
                    onChange={(event) =>
                      handleCountChange(event.target.value, setAacColumns)
                    }
                    className="w-16 rounded-lg border border-black-25 px-3 py-2 text-center text-14-regular text-black-90"
                    min={1}
                    max={5}
                  />
                  <span className="text-12-regular text-black-50">
                    최대 5 X 5
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-14-semibold text-black-90">
                  용지 방향
                </span>
                <div className="flex gap-2">
                  {(["vertical", "horizontal"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAacOrientation(value)}
                      className={`flex-1 rounded-lg border px-4 py-2 text-14-semibold transition ${
                        aacOrientation === value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-black-25 text-black-70 hover:border-black-40"
                      }`}
                    >
                      {value === "vertical" ? "세로" : "가로"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-14-semibold text-black-90">
                  텍스트 위치
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { value: "top", label: "상징 위" },
                      { value: "bottom", label: "상징 아래" },
                      { value: "none", label: "없음" },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setAacLabelPosition(option.value)}
                      className={`rounded-lg border px-3 py-2 text-14-semibold transition ${
                        aacLabelPosition === option.value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-black-25 text-black-70 hover:border-black-40"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <span className="text-14-semibold text-black-90">미리보기</span>
                <div className="flex items-center justify-center rounded-xl border border-black-25 bg-black-5 px-4 py-5">
                  <div
                    className="relative flex items-center justify-center"
                    style={{
                      width: `${previewBoxWidth}px`,
                      height: `${previewBoxHeight}px`,
                    }}
                  >
                    <div
                      className="relative overflow-hidden rounded-lg border border-black-25 bg-white-100"
                      style={{
                        width: `${previewScaledWidth}px`,
                        height: `${previewScaledHeight}px`,
                      }}
                    >
                      <div
                        style={{
                          width: `${previewBaseWidth}px`,
                          height: `${previewBaseHeight}px`,
                          transform: `scale(${previewScale})`,
                          transformOrigin: "top left",
                          pointerEvents: "none",
                        }}
                      >
                        <DesignPaper
                          pageId="aac-preview"
                          orientation={aacOrientation}
                          elements={previewElements}
                          selectedIds={[]}
                          editingTextId={null}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleApplyAacBoard}
                className="w-full rounded-lg bg-primary py-3 text-14-semibold text-white-100 transition hover:bg-primary/90"
              >
                캔버스에 추가
              </button>
            </div>
          </div>
        </div>
      )}
      {isStoryModalOpen && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black-90/30"
            onClick={() => setIsStoryModalOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white-100 p-6 shadow-xl">
            <button
              type="button"
              onClick={() => setIsStoryModalOpen(false)}
              className="absolute right-5 top-5 rounded-lg p-1 text-black-60 transition hover:bg-black-10 hover:text-black-100"
              aria-label="닫기"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mb-6">
              <h2 className="text-title-20-semibold text-black-100">
                이야기 장면 순서 맞추기 설정
              </h2>
            </div>
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <span className="text-14-semibold text-black-90">
                  카드 개수
                </span>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={storyCount}
                    onChange={(event) =>
                      handleStoryCountChange(event.target.value)
                    }
                    className="w-16 rounded-lg border border-black-25 px-3 py-2 text-center text-14-regular text-black-90"
                    min={1}
                    max={8}
                  />
                  <span className="text-12-regular text-black-50">
                    최대 8개
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-14-semibold text-black-90">
                  카드 순서 방향
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { value: "left-to-right", label: "왼쪽 → 오른쪽" },
                      { value: "top-to-bottom", label: "위 → 아래" },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setStoryDirection(option.value)}
                      className={`rounded-lg border px-3 py-2 text-14-semibold transition ${
                        storyDirection === option.value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-black-25 text-black-70 hover:border-black-40"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-14-semibold text-black-90">
                  카드 비율
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { value: "4:3", label: "4:3" },
                      { value: "16:9", label: "16:9" },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setStoryRatio(option.value)}
                      className={`rounded-lg border px-3 py-2 text-14-semibold transition ${
                        storyRatio === option.value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-black-25 text-black-70 hover:border-black-40"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-14-semibold text-black-90">
                  용지 방향
                </span>
                <div className="flex gap-2">
                  {(["vertical", "horizontal"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setStoryOrientation(value)}
                      className={`flex-1 rounded-lg border px-4 py-2 text-14-semibold transition ${
                        storyOrientation === value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-black-25 text-black-70 hover:border-black-40"
                      }`}
                    >
                      {value === "vertical" ? "세로" : "가로"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <span className="text-14-semibold text-black-90">미리보기</span>
                <div className="flex items-center justify-center rounded-xl border border-black-25 bg-black-5 px-4 py-5">
                  <div
                    className="relative flex items-center justify-center"
                    style={{
                      width: `${previewBoxWidth}px`,
                      height: `${previewBoxHeight}px`,
                    }}
                  >
                    <div
                      className="relative overflow-hidden rounded-lg border border-black-25 bg-white-100"
                      style={{
                        width: `${storyPreviewScaledWidth}px`,
                        height: `${storyPreviewScaledHeight}px`,
                      }}
                    >
                      <div
                        style={{
                          width: `${storyPreviewBaseWidth}px`,
                          height: `${storyPreviewBaseHeight}px`,
                          transform: `scale(${storyPreviewScale})`,
                          transformOrigin: "top left",
                          pointerEvents: "none",
                        }}
                      >
                        <DesignPaper
                          pageId="story-preview"
                          orientation={storyOrientation}
                          elements={storyPreviewElements}
                          selectedIds={[]}
                          editingTextId={null}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleApplyStoryBoard}
                className="w-full rounded-lg bg-primary py-3 text-14-semibold text-white-100 transition hover:bg-primary/90"
              >
                캔버스에 추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateContent;
