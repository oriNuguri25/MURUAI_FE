import {
  useEffect,
  useRef,
  useState,
  type RefObject,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { supabase } from "@/shared/supabase/supabase";
import { useToastStore } from "../store/toastStore";
import { useImageFillStore } from "../store/imageFillStore";

type UploadedFile = {
  id: string;
  image_path: string;
  created_at: string;
};

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLAUDINARY_CLOUD_NAME as
  | string
  | undefined;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env
  .VITE_CLAUDINARY_UPLOAD_PRESET as string | undefined;

const getImageUrl = (path: string) => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (CLOUDINARY_CLOUD_NAME) {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${path}`;
  }
  return path;
};

type UploadedFileItem = UploadedFile & { url: string };

export const useUploadContentState = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const showToast = useToastStore((state) => state.showToast);
  const requestImageFill = useImageFillStore(
    (state) => state.requestImageFill
  );
  const [contextMenu, setContextMenu] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        setUploadedFiles([]);
        return;
      }
      setIsFetching(true);
      const { data: uploads, error } = await supabase
        .from("user_uploads_n")
        .select("id,image_path,created_at")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (!isMounted) return;
      if (error) {
        setIsFetching(false);
        showToast("업로드 목록을 불러오지 못했어요.");
        return;
      }
      setUploadedFiles((uploads as UploadedFile[]) ?? []);
      setIsFetching(false);
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [showToast]);

  const handleUploadClick = () => {
    inputRef.current?.click();
  };

  const handleDeleteUpload = async (id: string) => {
    const { error } = await supabase
      .from("user_uploads_n")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      showToast("삭제하지 못했어요.");
      return;
    }
    setUploadedFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      showToast("업로드 환경 설정이 필요해요.");
      return;
    }

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      showToast("JPG 또는 PNG 파일만 업로드할 수 있어요.");
      return;
    }

    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      showToast("로그인이 필요해요.");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      const publicId = crypto.randomUUID();
      const folder = `muru-user-uploads/${user.id}`;
      formData.append("file", file);
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
        throw new Error("Upload failed");
      }

      const payload = (await response.json()) as {
        public_id: string;
        format?: string;
      };
      const imagePath = payload.format
        ? `${payload.public_id}.${payload.format}`
        : payload.public_id;

      const { error } = await supabase.from("user_uploads_n").insert({
        user_id: user.id,
        image_path: imagePath,
        created_at: new Date().toISOString(),
      });

      if (error) {
        showToast("업로드 정보를 저장하지 못했어요.");
        return;
      }

      const { data: uploads, error: uploadsError } = await supabase
        .from("user_uploads_n")
        .select("id,image_path,created_at")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (uploadsError) {
        showToast("업로드 목록을 불러오지 못했어요.");
        return;
      }
      setUploadedFiles((uploads as UploadedFile[]) ?? []);
    } catch {
      showToast("업로드에 실패했어요.");
    } finally {
      setIsLoading(false);
    }
  };

  const fileItems: UploadedFileItem[] = uploadedFiles.map((file) => ({
    ...file,
    url: getImageUrl(file.image_path),
  }));

  const handleOpenContextMenu = (
    event: ReactMouseEvent<HTMLDivElement>,
    id: string
  ) => {
    event.preventDefault();
    setContextMenu({
      id,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleDeleteFromMenu = (id: string) => {
    handleDeleteUpload(id);
    setContextMenu(null);
  };

  return {
    inputRef: inputRef as RefObject<HTMLInputElement | null>,
    isLoading,
    isFetching,
    files: fileItems,
    contextMenu,
    onUploadClick: handleUploadClick,
    onFileChange: handleFileChange,
    onOpenContextMenu: handleOpenContextMenu,
    onCloseContextMenu: () => setContextMenu(null),
    onDeleteUpload: handleDeleteFromMenu,
    onSelectImage: requestImageFill,
  };
};
