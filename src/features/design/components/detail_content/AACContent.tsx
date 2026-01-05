import { useEffect, useState, type DragEvent as ReactDragEvent } from "react";
import { Utensils, Dog, Shirt, Search } from "lucide-react";
import { supabase } from "@/shared/supabase/supabase";
import { useImageFillStore } from "../../store/imageFillStore";

type Category = "food" | "animal" | "clothing";
type CloudinaryImage = {
  id: string;
  url: string;
  alt: string;
  emoji: string;
};

type AacCardRow = {
  id: string;
  label: string;
  category: string;
  emoji: string | null;
  image_path: string;
};

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLAUDINARY_CLOUD_NAME as
  | string
  | undefined;

const CATEGORY_VALUE_MAP: Record<Category, string> = {
  food: "food",
  animal: "animal",
  clothing: "clothes",
};

const getImageUrl = (path: string) => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (CLOUDINARY_CLOUD_NAME) {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${path}`;
  }
  return path;
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
  const [images, setImages] = useState<CloudinaryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const requestImageFill = useImageFillStore(
    (state) => state.requestImageFill
  );

  const categories = [
    { id: "food" as Category, name: "음식", icon: Utensils },
    { id: "animal" as Category, name: "동물", icon: Dog },
    { id: "clothing" as Category, name: "옷", icon: Shirt },
  ];

  useEffect(() => {
    const controller = new AbortController();
    const fetchImages = async () => {
      try {
        setIsLoading(true);
        const categoryValue = CATEGORY_VALUE_MAP[selectedCategory];
        const { data, error } = await supabase
          .from("aac_cards")
          .select("id,label,category,emoji,image_path")
          .eq("category", categoryValue)
          .abortSignal(controller.signal);
        if (error) {
          setImages([]);
          return;
        }
        const nextImages = (data as AacCardRow[]).map((item) => ({
          id: item.id,
          url: getImageUrl(item.image_path),
          alt: item.label,
          emoji: item.emoji ?? "",
        }));
        setImages(nextImages);
      } catch {
        if (!controller.signal.aborted) {
          setImages([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchImages();

    return () => {
      controller.abort();
    };
  }, [selectedCategory]);

  const filteredImages = images.filter((image) =>
    image.alt.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
