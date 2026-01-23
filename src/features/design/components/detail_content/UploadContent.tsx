import {
  useEffect,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type RefObject,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { supabase } from "@/shared/supabase/supabase";
import { useToastStore } from "../../store/toastStore";
import { useImageFillStore } from "../../store/imageFillStore";

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

const setDragImageData = (
  event: ReactDragEvent<HTMLElement>,
  imageUrl: string
) => {
  event.dataTransfer.setData("application/x-muru-image", imageUrl);
  event.dataTransfer.setData("text/plain", imageUrl);
  event.dataTransfer.effectAllowed = "copy";
};

type UploadedFileItem = UploadedFile & { url: string };

type UploadContentViewProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  isLoading: boolean;
  isFetching: boolean;
  files: UploadedFileItem[];
  contextMenu: { id: string; x: number; y: number } | null;
  onUploadClick: () => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenContextMenu: (
    event: ReactMouseEvent<HTMLDivElement>,
    id: string
  ) => void;
  onCloseContextMenu: () => void;
  onDeleteUpload: (id: string) => void;
  onSelectImage: (url: string) => void;
};

const UploadContentView = ({
  inputRef,
  isLoading,
  isFetching,
  files,
  contextMenu,
  onUploadClick,
  onFileChange,
  onOpenContextMenu,
  onCloseContextMenu,
  onDeleteUpload,
  onSelectImage,
}: UploadContentViewProps) => (
  <div className="flex flex-col items-center pt-3 gap-6">
    <button
      type="button"
      onClick={onUploadClick}
      className="flex items-center justify-center w-full px-4 py-3 bg-[#5500ff]/40 rounded-xl transition hover:bg-[#5500ff]/50 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isLoading}
    >
      <span className="flex text-title-16-semibold text-white-100">
        {isLoading ? "업로드 중..." : "파일 업로드"}
      </span>
    </button>
    <input
      ref={inputRef}
      type="file"
      accept=".jpg,.jpeg,.png"
      className="hidden"
      onChange={onFileChange}
    />

    <div className="flex flex-col w-full gap-3">
      <div className="flex items-center justify-start w-full">
        <span className="flex text-title-14-semibold">내가 업로드한 파일</span>
      </div>

      {/* 업로드된 파일 목록 영역 */}
      <div className="flex flex-col w-full flex-1 p-4">
        {isFetching ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-body-14-regular text-gray-400">
              업로드 된 파일을 가져오는 중입니다.
            </span>
          </div>
        ) : files.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-body-14-regular text-gray-400">
              아직 업로드된 파일이 없습니다.
            </span>
          </div>
        ) : (
          <div className="grid w-full grid-cols-2 gap-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex w-full items-center justify-center rounded-lg border border-black-25 p-3"
                onContextMenu={(event) => onOpenContextMenu(event, file.id)}
              >
                <img
                  src={file.url}
                  alt="Uploaded"
                  className="w-full h-auto object-contain"
                  draggable
                  onDragStart={(event) => setDragImageData(event, file.url)}
                  onClick={() => onSelectImage(file.url)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    {contextMenu && (
      <>
        <div
          className="fixed inset-0 z-40"
          onClick={onCloseContextMenu}
          aria-hidden="true"
        />
        <div
          className="fixed z-50 w-36 rounded-lg border border-black-25 bg-white-100 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onContextMenu={(event) => event.preventDefault()}
        >
          <button
            type="button"
            className="flex w-full items-center justify-start px-3 py-2 text-14-regular text-black-90 hover:bg-black-10"
            onClick={() => onDeleteUpload(contextMenu.id)}
          >
            삭제하기
          </button>
        </div>
      </>
    )}
  </div>
);

const UploadContent = () => {
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

  return (
    <UploadContentView
      inputRef={inputRef}
      isLoading={isLoading}
      isFetching={isFetching}
      files={fileItems}
      contextMenu={contextMenu}
      onUploadClick={handleUploadClick}
      onFileChange={handleFileChange}
      onOpenContextMenu={handleOpenContextMenu}
      onCloseContextMenu={() => setContextMenu(null)}
      onDeleteUpload={handleDeleteFromMenu}
      onSelectImage={requestImageFill}
    />
  );
};

export default UploadContent;
