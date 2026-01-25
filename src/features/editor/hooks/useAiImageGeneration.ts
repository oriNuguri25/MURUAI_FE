import { useState } from "react";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/shared/supabase/supabase";
import { useToastStore } from "../store/toastStore";
import { useImageFillStore } from "../store/imageFillStore";

export type ImageStyle = "photo" | "illustration" | "lineart";

export type StyleOption = {
  id: ImageStyle;
  label: string;
  stylePrompt: string | null;
};

export type GeneratedImage = {
  id: string;
  url: string;
  createdAt: string;
};

export const STYLE_OPTIONS: StyleOption[] = [
  { id: "photo", label: "실사 이미지", stylePrompt: null },
  { id: "illustration", label: "그림, 일러스트", stylePrompt: null },
  { id: "lineart", label: "흑백 선화", stylePrompt: null },
];

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLAUDINARY_CLOUD_NAME as string | undefined;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLAUDINARY_UPLOAD_PRESET as string | undefined;

const getCloudinaryUrl = (path: string): string => {
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
  userId: string
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
    }
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

/**
 * AI 이미지 생성 훅
 * - Gemini API 호출 + Cloudinary 업로드 로직 담당
 * - store 구독은 selector 기반
 */
export const useAiImageGeneration = () => {
  const [selectedStyle, setSelectedStyle] = useState<ImageStyle>("photo");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

  // selector 기반 구독
  const showToast = useToastStore((s) => s.showToast);
  const requestImageFill = useImageFillStore((s) => s.requestImageFill);

  const getSelectedStyleOption = () =>
    STYLE_OPTIONS.find((option) => option.id === selectedStyle);

  const buildFinalPrompt = () => {
    const styleOption = getSelectedStyleOption();
    const stylePrompt = styleOption?.stylePrompt;
    const userPrompt = prompt.trim();

    if (stylePrompt && userPrompt) {
      return `${stylePrompt}, ${userPrompt}`;
    }
    return userPrompt;
  };

  const canGenerate = prompt.trim().length > 0 && !isGenerating;

  const generate = async () => {
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
      const base64Image = await generateImageWithGemini(finalPrompt);
      const imagePath = await uploadToCloudinary(base64Image, user.id);
      const imageUrl = getCloudinaryUrl(imagePath);

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

  const addImageToCanvas = (imageUrl: string) => {
    requestImageFill(imageUrl);
  };

  return {
    // state
    selectedStyle,
    prompt,
    isGenerating,
    generatedImages,
    canGenerate,
    // actions
    setSelectedStyle,
    setPrompt,
    generate,
    addImageToCanvas,
  };
};
