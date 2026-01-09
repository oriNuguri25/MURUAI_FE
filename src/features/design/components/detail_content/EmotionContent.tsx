import {
  Camera,
  Construction,
  Image,
  PenLine,
  Search,
  User,
} from "lucide-react";
import { useState, type DragEvent as ReactDragEvent, useMemo } from "react";
import type { ReactNode } from "react";
import { useImageFillStore } from "../../store/imageFillStore";
import { useEmotionPhotos } from "../../hooks/useEmotionPhotos";

// 더미 데이터
const EMOTIONS = [
  { id: 1, name: "기쁨", image: "😊" },
  { id: 2, name: "슬픔", image: "😢" },
  { id: 3, name: "화남", image: "😠" },
  { id: 4, name: "놀람", image: "😲" },
  { id: 5, name: "사랑", image: "😍" },
  { id: 6, name: "피곤함", image: "😴" },
  { id: 7, name: "신남", image: "🤗" },
  { id: 8, name: "걱정", image: "😟" },
  { id: 9, name: "평온함", image: "😌" },
  { id: 10, name: "불안함", image: "😰" },
];

const getTwemojiUrl = (emoji: string) => {
  const codepoints = Array.from(emoji).map((char) => {
    const code = char.codePointAt(0);
    return code ? code.toString(16) : "";
  });
  const joined = codepoints.filter(Boolean).join("-");
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${joined}.png`;
};

const setDragImageData = (
  event: ReactDragEvent<HTMLElement>,
  imageUrl: string
) => {
  event.dataTransfer.setData("application/x-muru-image", imageUrl);
  event.dataTransfer.setData("text/plain", imageUrl);
  event.dataTransfer.effectAllowed = "copy";
};

// 공통 컴포넌트
const ToggleButton = ({
  isActive,
  onClick,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`flex-1 px-4 py-2 rounded-md text-14-semibold transition-all ${
      isActive
        ? "bg-white-100 text-primary shadow-sm bg-[#5500ff]/15"
        : "text-black-60 hover:text-black-90"
    }`}
  >
    {children}
  </button>
);

const TypeButton = ({
  isActive,
  onClick,
  icon: Icon,
  label,
}: {
  isActive: boolean;
  onClick: () => void;
  icon: typeof Camera;
  label: string;
}) => (
  <button
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-2 px-2 py-2.5 rounded-lg border transition-all ${
      isActive
        ? "border-primary bg-primary/5 text-primary"
        : "border-black-25 text-black-70 hover:border-black-40 hover:bg-black-5"
    }`}
  >
    <Icon className="icon-xs" />
    <span className="text-12-semibold">{label}</span>
  </button>
);

const ComingSoon = () => (
  <div className="flex flex-col items-center justify-center gap-4 py-20">
    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-black-10">
      <Construction className="icon-l text-black-50" />
    </div>
    <div className="flex flex-col items-center gap-1">
      <span className="text-16-semibold text-black-90">아직 준비중입니다</span>
      <span className="text-14-regular text-black-60">곧 만나보실 수 있어요</span>
    </div>
  </div>
);

const SearchInput = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className="relative w-full">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 icon-xs text-black-50" />
    <input
      type="text"
      placeholder="감정 검색..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full pl-9 pr-4 py-2.5 border border-black-25 rounded-lg text-14-regular text-black-90 placeholder:text-black-50 focus:outline-none focus:border-primary transition-colors"
    />
  </div>
);

const EmotionList = ({
  emotions,
}: {
  emotions: typeof EMOTIONS;
}) => {
  const requestImageFill = useImageFillStore(
    (state) => state.requestImageFill
  );

  return (
    <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1 min-h-0">
      {emotions.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {emotions.map((emotion) => {
            const imageUrl = getTwemojiUrl(emotion.image);
            return (
              <button
                key={emotion.id}
                draggable
                onDragStart={(event) => setDragImageData(event, imageUrl)}
                onClick={() => requestImageFill(imageUrl, emotion.name)}
                className="flex flex-col items-center justify-center gap-2 p-4 border border-black-25 rounded-lg hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group"
              >
                <img
                  src={imageUrl}
                  alt={emotion.name}
                  className="h-10 w-10"
                  loading="lazy"
                />
                <span className="text-14-semibold text-black-90 group-hover:text-primary transition-colors">
                  {emotion.name}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center py-12 text-14-regular text-black-50">
          검색 결과가 없습니다
        </div>
      )}
    </div>
  );
};

const GenderToggle = ({
  gender,
  onGenderChange,
}: {
  gender: "boy" | "girl";
  onGenderChange: (gender: "boy" | "girl") => void;
}) => (
  <div className="flex gap-2 p-1 bg-black-10 rounded-lg w-full">
    <button
      onClick={() => onGenderChange("boy")}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-14-semibold transition-all ${
        gender === "boy"
          ? "bg-white-100 text-primary shadow-sm bg-[#5500ff]/15"
          : "text-black-60 hover:text-black-90"
      }`}
    >
      <User className="icon-xs" />
      남자아이
    </button>
    <button
      onClick={() => onGenderChange("girl")}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-14-semibold transition-all ${
        gender === "girl"
          ? "bg-white-100 text-primary shadow-sm bg-[#5500ff]/15"
          : "text-black-60 hover:text-black-90"
      }`}
    >
      <User className="icon-xs" />
      여자아이
    </button>
  </div>
);

// 메인 컴포넌트
const EmotionContent = () => {
  const [selectedMode, setSelectedMode] = useState<"basic" | "ai">("basic");

  return (
    <div className="flex flex-col w-full h-full gap-6">
      <div className="flex items-center text-start">
        <span className="flex text-14-regular text-black-70">
          다양한 감정을 클릭하여 우측 캔버스에 추가해보세요.
        </span>
      </div>

      <div className="flex flex-col w-full flex-1 gap-5 min-h-0">
        <div className="flex gap-2 p-1 bg-black-10 rounded-lg w-full">
          <ToggleButton
            isActive={selectedMode === "basic"}
            onClick={() => setSelectedMode("basic")}
          >
            기본 감정
          </ToggleButton>
          <ToggleButton
            isActive={selectedMode === "ai"}
            onClick={() => setSelectedMode("ai")}
          >
            내 캐릭터 (AI)
          </ToggleButton>
        </div>

        <div className="flex flex-col flex-1 gap-2 min-h-0">
          {selectedMode === "basic" ? <EmotionContentArea /> : <ComingSoon />}
        </div>
      </div>
    </div>
  );
};

const EmotionContentArea = () => {
  const [selectedType, setSelectedType] = useState<
    "photo" | "drawing" | "line"
  >("photo");

  return (
    <div className="flex flex-col w-full h-full gap-4">
      <div className="flex gap-1.5 w-full">
        <TypeButton
          isActive={selectedType === "photo"}
          onClick={() => setSelectedType("photo")}
          icon={Camera}
          label="실제 사진"
        />
        <TypeButton
          isActive={selectedType === "drawing"}
          onClick={() => setSelectedType("drawing")}
          icon={Image}
          label="그림"
        />
        <TypeButton
          isActive={selectedType === "line"}
          onClick={() => setSelectedType("line")}
          icon={PenLine}
          label="선그림"
        />
      </div>

      <div className="flex flex-col flex-1 gap-2 min-h-0">
        {selectedType === "photo" && <PhotoEmotionContent />}
        {selectedType === "drawing" && <DrawingEmotionContent />}
        {selectedType === "line" && <ComingSoon />}
      </div>
    </div>
  );
};

const PhotoEmotionContent = () => {
  const [gender, setGender] = useState<"boy" | "girl">("boy");
  const [searchTerm, setSearchTerm] = useState("");
  const { data: allEmotionPhotos, isLoading } = useEmotionPhotos();
  const requestImageFill = useImageFillStore(
    (state) => state.requestImageFill
  );

  // 선택된 성별로 필터링
  const genderEmotions = useMemo(() => {
    if (!allEmotionPhotos) return [];
    return allEmotionPhotos.filter((photo) => photo.category === gender);
  }, [allEmotionPhotos, gender]);

  // 검색어로 필터링
  const filteredEmotions = useMemo(() => {
    return genderEmotions.filter((emotion) =>
      emotion.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [genderEmotions, searchTerm]);

  return (
    <div className="flex flex-col w-full h-full gap-3">
      <GenderToggle gender={gender} onGenderChange={setGender} />
      <SearchInput value={searchTerm} onChange={setSearchTerm} />
      <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-14-regular text-black-50">
            불러오는 중입니다
          </div>
        ) : filteredEmotions.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {filteredEmotions.map((emotion) => (
              <button
                key={emotion.id}
                draggable
                onDragStart={(event) => setDragImageData(event, emotion.url)}
                onClick={() => requestImageFill(emotion.url, emotion.label)}
                className="flex flex-col items-center justify-center gap-2 p-4 border border-black-25 rounded-lg hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group"
              >
                <div className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden bg-white">
                  <img
                    src={emotion.url}
                    alt={emotion.label}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-14-semibold text-black-90 group-hover:text-primary transition-colors">
                  {emotion.label}
                </span>
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

const DrawingEmotionContent = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredEmotions = EMOTIONS.filter((emotion) =>
    emotion.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full h-full gap-3">
      <SearchInput value={searchTerm} onChange={setSearchTerm} />
      <EmotionList emotions={filteredEmotions} />
    </div>
  );
};

export default EmotionContent;
export { EmotionContentArea };
