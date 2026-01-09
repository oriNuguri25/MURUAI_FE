import { useState, type DragEvent as ReactDragEvent, useMemo } from "react";
import { Utensils, Dog, Shirt, Search } from "lucide-react";
import { useImageFillStore } from "../../store/imageFillStore";
import { useAacCards } from "../../hooks/useAacCards";

type Category = "food" | "animal" | "clothing";

const CATEGORY_VALUE_MAP: Record<Category, string> = {
  food: "food",
  animal: "animal",
  clothing: "clothes",
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
    { id: "food" as Category, name: "음식", icon: Utensils },
    { id: "animal" as Category, name: "동물", icon: Dog },
    { id: "clothing" as Category, name: "옷", icon: Shirt },
  ];

  // 선택된 카테고리로 필터링
  const categoryImages = useMemo(() => {
    if (!allCards) return [];
    const categoryValue = CATEGORY_VALUE_MAP[selectedCategory];
    return allCards.filter((card) => card.category === categoryValue);
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
      <div className="flex gap-2">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-3 border rounded-lg transition-all ${
                selectedCategory === category.id
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-black-25 text-black-70 hover:border-primary hover:bg-primary/5"
              }`}
            >
              <Icon className="icon-s" />
              <span className="text-14-semibold">{category.name}</span>
            </button>
          );
        })}
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
                <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-xl bg-white overflow-hidden transition-transform group-hover:scale-110">
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
