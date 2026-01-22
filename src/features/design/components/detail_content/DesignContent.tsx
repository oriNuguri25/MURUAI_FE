import { useState } from "react";
import { Camera, Image, PenLine, Sparkles, Loader2 } from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/shared/supabase/supabase";
import { useToastStore } from "../../store/toastStore";
import { useImageFillStore } from "../../store/imageFillStore";

type ImageStyle = "photo" | "illustration" | "lineart";

type StyleOption = {
  id: ImageStyle;
  icon: typeof Camera;
  label: string;
  stylePrompt: string | null;
};

type GeneratedImage = {
  id: string;
  url: string;
  createdAt: string;
};

const STYLE_OPTIONS: StyleOption[] = [
  { id: "photo", icon: Camera, label: "실사 이미지", stylePrompt: null },
  {
    id: "illustration",
    icon: Image,
    label: "그림, 일러스트",
    stylePrompt: null,
  },
  { id: "lineart", icon: PenLine, label: "흑백 선화", stylePrompt: null },
];

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as
  | string
  | undefined;
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLAUDINARY_CLOUD_NAME as
  | string
  | undefined;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env
  .VITE_CLAUDINARY_UPLOAD_PRESET as string | undefined;

const getCloudinaryUrl = (path: string) => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (CLOUDINARY_CLOUD_NAME) {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${path}`;
  }
  return path;
};

const generateImageWithGemini = async (prompt: string): Promise<string> => {
  if (!GOOGLE_API_KEY) {
    throw new Error("Google API key is not configured");
  }

  const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: prompt,
    config: {
      responseModalities: ["Text", "Image"],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;

  if (!parts) {
    throw new Error("No response from Gemini");
  }

  const imagePart = parts.find((part) => part.inlineData);

  if (!imagePart?.inlineData?.data) {
    throw new Error("No image generated");
  }

  return imagePart.inlineData.data;
};

const uploadToCloudinary = async (
  base64Data: string,
  userId: string,
): Promise<string> => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("Cloudinary is not configured");
  }

  const formData = new FormData();
  const publicId = crypto.randomUUID();
  const folder = `muru_user_ai_gen/${userId}`;

  formData.append("file", `data:image/png;base64,${base64Data}`);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", folder);
  formData.append("public_id", publicId);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error("Failed to upload to Cloudinary");
  }

  const payload = (await response.json()) as {
    public_id: string;
    format?: string;
  };

  return payload.format
    ? `${payload.public_id}.${payload.format}`
    : payload.public_id;
};

const StyleButton = ({
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
    className={`flex-1 flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-lg border transition-all ${
      isActive
        ? "border-primary bg-primary/5 text-primary"
        : "border-black-25 text-black-70 hover:border-black-40 hover:bg-black-5"
    }`}
  >
    <Icon className="icon-xs" />
    <span className="text-12-semibold">{label}</span>
  </button>
);

const DesignContent = () => {
  const [selectedStyle, setSelectedStyle] = useState<ImageStyle>("photo");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const showToast = useToastStore((state) => state.showToast);
  const requestImageFill = useImageFillStore((state) => state.requestImageFill);

  const getSelectedStyleOption = () => {
    return STYLE_OPTIONS.find((option) => option.id === selectedStyle);
  };

  const buildFinalPrompt = () => {
    const styleOption = getSelectedStyleOption();
    const stylePrompt = styleOption?.stylePrompt;
    const userPrompt = prompt.trim();

    if (stylePrompt && userPrompt) {
      return `${stylePrompt}, ${userPrompt}`;
    }
    return userPrompt;
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      showToast("로그인이 필요해요.");
      return;
    }

    if (!GOOGLE_API_KEY) {
      showToast("API 설정이 필요해요.");
      return;
    }

    setIsGenerating(true);
    const finalPrompt = buildFinalPrompt();

    try {
      // Gemini로 이미지 생성
      const base64Image = await generateImageWithGemini(finalPrompt);

      // Cloudinary에 업로드
      const imagePath = await uploadToCloudinary(base64Image, user.id);
      const imageUrl = getCloudinaryUrl(imagePath);

      // 생성된 이미지 목록에 추가
      const newImage: GeneratedImage = {
        id: crypto.randomUUID(),
        url: imageUrl,
        createdAt: new Date().toISOString(),
      };
      setGeneratedImages((prev) => [newImage, ...prev]);

      // 캔버스에 이미지 요소로 바로 추가
      requestImageFill(imageUrl, "AI 생성 이미지", { width: 300, height: 300 });

      showToast("이미지가 생성되었어요!");
    } catch (error) {
      console.error("Image generation failed:", error);
      showToast(
        error instanceof Error ? error.message : "이미지 생성에 실패했어요."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageClick = (imageUrl: string) => {
    requestImageFill(imageUrl);
  };

  const canGenerate = prompt.trim().length > 0 && !isGenerating;

  return (
    <div className="flex flex-col w-full h-full gap-6">
      <div className="flex items-center text-start">
        <span className="text-14-regular text-black-70">
          AI로 원하는 이미지를 생성해보세요.
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {/* 스타일 선택 */}
        <div className="flex flex-col gap-2">
          <span className="text-14-semibold text-black-90">스타일 선택</span>
          <div className="flex gap-2">
            {STYLE_OPTIONS.map((option) => (
              <StyleButton
                key={option.id}
                isActive={selectedStyle === option.id}
                onClick={() => setSelectedStyle(option.id)}
                icon={option.icon}
                label={option.label}
              />
            ))}
          </div>
        </div>

        {/* 요구사항 입력 */}
        <div className="flex flex-col gap-2">
          <span className="text-14-semibold text-black-90">요구사항</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="생성하고 싶은 이미지를 설명해주세요.&#10;예: 웃고 있는 아이가 공원에서 놀고 있는 모습"
            className="w-full h-32 px-4 py-3 border border-black-25 rounded-xl text-14-regular text-black-90 placeholder:text-black-50 focus:outline-none focus:border-primary transition-colors resize-none"
          />
        </div>

        {/* 생성 버튼 */}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={`flex items-center justify-center gap-1.5 w-full py-3 rounded-lg text-14-semibold transition-all ${
            canGenerate
              ? "bg-primary text-white-100 hover:bg-primary/90"
              : "bg-black-20 text-black-50 cursor-not-allowed"
          }`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="icon-s animate-spin" />
              생성 중...
            </>
          ) : (
            <>
              <Sparkles className="icon-s" />
              이미지 생성하기
            </>
          )}
        </button>
      </div>

      {/* 생성된 이미지 표시 영역 */}
      <div className="flex flex-col gap-2 flex-1 min-h-0">
        <span className="text-14-semibold text-black-90">생성된 이미지</span>
        {generatedImages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center border border-dashed border-black-25 rounded-xl bg-black-5">
            <span className="text-14-regular text-black-50">
              생성된 이미지가 여기에 표시됩니다
            </span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              {generatedImages.map((image) => (
                <button
                  key={image.id}
                  onClick={() => handleImageClick(image.url)}
                  className="flex items-center justify-center p-2 border border-black-25 rounded-lg hover:border-primary hover:bg-primary/5 transition-all cursor-pointer"
                >
                  <img
                    src={image.url}
                    alt="Generated"
                    className="w-full h-auto object-contain rounded"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DesignContent;
