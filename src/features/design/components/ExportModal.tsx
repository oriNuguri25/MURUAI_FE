import { useState } from "react";
import BaseModal from "@/shared/ui/BaseModal";
import { useToastStore } from "../store/toastStore";
import {
  assignUserMadeToTarget,
  downloadBlob,
  generatePdfFromDomPages,
  saveUserMadeVersion,
} from "../utils/userMadeExport";

type TargetType = "child" | "group";

type TargetOption = {
  id: string;
  name: string;
};

type ExportModalProps = {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  getCanvasData: () => unknown;
  getName: () => string;
  lastSavedUserMadeId?: string | null;
  onSavedUserMadeId: (id: string) => void;
  students: TargetOption[];
  groups: TargetOption[];
  isLoadingTargets: boolean;
};

const ExportModal = ({
  open,
  onClose,
  userId,
  getCanvasData,
  getName,
  lastSavedUserMadeId = null,
  onSavedUserMadeId,
  students,
  groups,
  isLoadingTargets,
}: ExportModalProps) => {
  const showToast = useToastStore((state) => state.showToast);
  const [targetType, setTargetType] = useState<TargetType>("child");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const targets = targetType === "child" ? students : groups;
  const name = getName().trim() || "제목 없음";

  const handleSaveToTarget = async () => {
    if (!userId) {
      showToast("로그인이 필요해요.");
      return;
    }
    if (!targetId) {
      showToast("대상을 선택해주세요.");
      return;
    }
    setIsSaving(true);
    try {
      let userMadeId = lastSavedUserMadeId;
      if (!userMadeId) {
        const { id } = await saveUserMadeVersion({
          userId,
          name,
          canvasData: getCanvasData(),
        });
        userMadeId = id;
        onSavedUserMadeId(id);
      }
      await assignUserMadeToTarget({
        userMadeId,
        targetType,
        targetId,
      });
      showToast("저장했습니다.");
      onClose();
    } catch {
      showToast("저장하지 못했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const blob = await generatePdfFromDomPages({ quality: 6 });
      downloadBlob(blob, `${name}.pdf`);
    } catch {
      showToast("PDF를 만들지 못했어요.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <BaseModal isOpen={open} onClose={onClose} title="내보내기">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="text-14-semibold text-black-90">저장 대상</span>
          <div className="flex gap-2">
            {(["child", "group"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setTargetType(type);
                  setTargetId(null);
                }}
                className={`flex-1 rounded-lg border px-3 py-2 text-14-semibold transition ${
                  targetType === type
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-black-25 text-black-70 hover:border-black-40"
                }`}
              >
                {type === "child" ? "아동" : "그룹"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-14-semibold text-black-90">
            {targetType === "child" ? "아동 선택" : "그룹 선택"}
          </span>
          <div className="max-h-52 overflow-y-auto rounded-lg border border-black-25 p-2">
            {isLoadingTargets ? (
              <div className="flex items-center justify-center py-6 text-14-regular text-black-50">
                불러오는 중입니다.
              </div>
            ) : targets.length === 0 ? (
              <div className="flex items-center justify-center py-6 text-14-regular text-black-50">
                선택할 수 있는 대상이 없습니다.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {targets.map((target) => {
                  const isSelected = targetId === target.id;
                  return (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() => setTargetId(target.id)}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-14-regular transition ${
                        isSelected
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-black-25 text-black-70 hover:border-black-40"
                      }`}
                    >
                      <span>{target.name}</span>
                      <span
                        className={`h-4 w-4 rounded-full border ${
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-black-30"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleSaveToTarget}
            disabled={isSaving || !targetId || isLoadingTargets}
            className="w-full rounded-lg bg-primary py-3 text-14-semibold text-white-100 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "저장 중..." : "대상에 저장"}
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="w-full rounded-lg border border-black-25 py-3 text-14-semibold text-black-90 transition hover:border-black-40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDownloading ? "PDF 생성 중..." : "PDF 다운로드"}
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export default ExportModal;
