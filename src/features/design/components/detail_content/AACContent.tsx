import { useState } from "react";
import { Utensils, Dog, Shirt, Search } from "lucide-react";

type Category = "food" | "animal" | "clothing";

const AACContent = () => {
  const [selectedCategory, setSelectedCategory] = useState<Category>("food");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    { id: "food" as Category, name: "음식", icon: Utensils },
    { id: "animal" as Category, name: "동물", icon: Dog },
    { id: "clothing" as Category, name: "옷", icon: Shirt },
  ];

  // 예시 이미지 데이터 (실제로는 카테고리별로 다른 이미지를 보여줘야 함)
  const images = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    url: `https://via.placeholder.com/150?text=${selectedCategory}+${i + 1}`,
    alt: `${selectedCategory} ${i + 1}`,
  }));

  const filteredImages = images.filter((image) =>
    image.alt.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <div className="grid grid-cols-2 gap-3">
          {filteredImages.map((image) => (
            <button
              key={image.id}
              className="aspect-square border border-black-25 rounded-lg overflow-hidden hover:border-primary transition-all cursor-pointer group"
            >
              <img
                src={image.url}
                alt={image.alt}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AACContent;
