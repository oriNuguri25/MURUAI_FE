import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReset?: () => void;
  title: string | ReactNode;
  children: ReactNode;
}

const BaseModal = ({ isOpen, onClose, onReset, title, children }: BaseModalProps) => {
  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [isOpen]);

  const handleClose = () => {
    onReset?.();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center backdrop-blur-sm overflow-hidden">
      {/* 모달 배경 */}
      <div
        className="absolute inset-0"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* 모달 콘텐츠 */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white-100 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-6 right-6 z-20 rounded-lg p-1 text-black-70 transition hover:bg-black-10 hover:text-black-100"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>

        {/* 헤더 */}
        <div className="mb-6">
          {typeof title === "string" ? (
            <h2 className="text-title-20-semibold text-black-100 pr-8">{title}</h2>
          ) : (
            <div className="pr-8">{title}</div>
          )}
        </div>

        {/* 컨텐츠 */}
        {children}
      </div>
    </div>
  );
};

export default BaseModal;
