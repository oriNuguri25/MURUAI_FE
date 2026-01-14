import { useState, type DragEvent as ReactDragEvent, useMemo } from "react";
import { Search } from "lucide-react";
import { useImageFillStore } from "../../store/imageFillStore";
import { useAacCards } from "../../hooks/useAacCards";

type Category = "food" | "animal" | "clothing" | "verb";

const CATEGORY_VALUE_MAP: Record<Category, string[]> = {
  food: ["food"],
  animal: ["animal"],
  clothing: ["clothes"],
  verb: ["verb", "action", "actions"],
};

const setDragImageData = (
  event: ReactDragEvent<HTMLElement>,
  imageUrl: string
) => {
  event.dataTransfer.setData("application/x-muru-image", imageUrl);
  event.dataTransfer.setData("text/plain", imageUrl);
  event.dataTransfer.effectAllowed = "copy";
};

const AACContent = () => {
  const [selectedCategory, setSelectedCategory] = useState<Category>("food");
  const [searchQuery, setSearchQuery] = useState("");
  const { data: allCards, isLoading } = useAacCards();
  const requestImageFill = useImageFillStore(
    (state) => state.requestImageFill
  );

  const categories = [
    { id: "food" as Category, name: "음식" },
    { id: "animal" as Category, name: "동물" },
    { id: "clothing" as Category, name: "옷" },
    { id: "verb" as Category, name: "동사" },
  ];
  const categoryStyles: Record<
    Category,
    { base: string; selected: string }
  > = {
    food: {
      base: "border-[#F59E0B]/40 bg-[#FFF7ED] text-[#B45309]",
      selected: "border-[#F59E0B] bg-[#FED7AA] text-[#92400E]",
    },
    animal: {
      base: "border-[#10B981]/40 bg-[#ECFDF5] text-[#047857]",
      selected: "border-[#10B981] bg-[#A7F3D0] text-[#065F46]",
    },
    clothing: {
      base: "border-[#3B82F6]/40 bg-[#EFF6FF] text-[#1D4ED8]",
      selected: "border-[#3B82F6] bg-[#BFDBFE] text-[#1E40AF]",
    },
    verb: {
      base: "border-[#06B6D4]/40 bg-[#ECFEFF] text-[#0E7490]",
      selected: "border-[#06B6D4] bg-[#A5F3FC] text-[#155E75]",
    },
  };

  // 선택된 카테고리로 필터링
  const categoryImages = useMemo(() => {
    if (!allCards) return [];
    const categoryValues = CATEGORY_VALUE_MAP[selectedCategory];
    return allCards.filter((card) => categoryValues.includes(card.category));
  }, [allCards, selectedCategory]);

  // 검색어로 필터링
  const filteredImages = useMemo(() => {
    return categoryImages.filter((image) =>
      image.alt.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [categoryImages, searchQuery]);

  const handleImageError = (
    event: React.SyntheticEvent<HTMLImageElement>,
    emoji: string
  ) => {
    const img = event.currentTarget;
    img.style.display = "none";
    const parent = img.parentElement;
    if (!parent) return;
    const fallback = document.createElement("span");
    fallback.textContent = emoji || "🖼️";
    fallback.className = "text-24-regular";
    parent.appendChild(fallback);
  };

  return (
    <div className="flex flex-col w-full h-full gap-6">
      <div className="flex items-center text-start">
        <span className="flex text-14-regular text-black-70">
          카테고리를 선택하고 이미지를 클릭하여
          <br /> 캔버스에 추가해보세요.
        </span>
      </div>

      {/* 카테고리 버튼 */}
      <div className="grid grid-cols-4 gap-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`flex w-full items-center justify-center px-3 py-2.5 border rounded-lg transition-all ${
              selectedCategory === category.id
                ? categoryStyles[category.id].selected
                : `${categoryStyles[category.id].base} hover:brightness-95`
            }`}
          >
            <span className="text-13-semibold">{category.name}</span>
          </button>
        ))}
      </div>

      {/* 검색 영역 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 icon-s text-black-50" />
        <input
          type="text"
          placeholder="검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-black-25 rounded-lg text-14-regular placeholder:text-black-50 focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* 이미지 그리드 영역 (스크롤 가능) */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-14-regular text-black-50">
            불러오는 중입니다
          </div>
        ) : filteredImages.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredImages.map((image) => (
              <button
                key={image.id}
                draggable
                onDragStart={(event) => setDragImageData(event, image.url)}
                onClick={() => requestImageFill(image.url, image.alt)}
                className="flex flex-col items-center p-3 rounded-xl border-2 border-black-25 hover:border-primary hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-xl bg-white overflow-hidden">
                  <img
                    src={image.url}
                    alt={image.alt}
                    className="h-full w-full object-contain"
                    onError={(event) => handleImageError(event, image.emoji)}
                  />
                </div>
                <span className="text-12-medium text-black-70">{image.alt}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-12 text-14-regular text-black-50">
            검색 결과가 없습니다
          </div>
        )}
      </div>
    </div>
  );
};

export default AACContent;
