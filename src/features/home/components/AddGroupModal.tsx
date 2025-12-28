import { useState } from "react";
import { useModalStore } from "@/shared/store/useModalStore";
import BaseModal from "@/shared/ui/BaseModal";

interface Member {
  id: number;
  name: string;
  birthYear: number;
}

const AddGroupModal = () => {
  const { openModal, closeModal } = useModalStore();
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);

  const isOpen = openModal === "addGroup";

  const handleReset = () => {
    setGroupName("");
    setDescription("");
    setSelectedMembers([]);
  };

  // TODO: 실제 데이터는 API에서 가져와야 함
  const availableMembers: Member[] = [];
  const hasMembers = availableMembers.length > 0;

  const calculateAge = (birthYear: number) => {
    const currentYear = new Date().getFullYear();
    return currentYear - birthYear;
  };

  const handleMemberToggle = (memberId: number) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : prev.length < 5
        ? [...prev, memberId]
        : prev
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: 그룹 추가 로직
    console.log({
      groupName,
      description,
      selectedMembers,
    });
    handleReset();
    closeModal();
  };

  const isSubmitDisabled = !groupName.trim() || selectedMembers.length === 0;

  return (
    <BaseModal isOpen={isOpen} onClose={closeModal} onReset={handleReset} title="그룹 추가하기">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* 그룹 이름 */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="groupName"
            className="text-title-14-semibold text-black-100"
          >
            그룹 이름
          </label>
          <input
            type="text"
            id="groupName"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="rounded-lg border border-black-30 px-4 py-3 text-15-regular text-black-100 transition focus:border-primary focus:outline-none"
            placeholder="그룹 이름을 입력하세요"
            required
          />
        </div>

        {/* 설명 */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="description"
            className="text-title-14-semibold text-black-100"
          >
            설명 (선택)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-24 rounded-lg border border-black-30 px-4 py-3 text-15-regular text-black-100 transition focus:border-primary focus:outline-none resize-none"
            placeholder="그룹 설명을 입력하세요"
          />
        </div>

        {/* 멤버 선택 */}
        <div className="flex flex-col gap-2">
          <label className="text-title-14-semibold text-black-100">
            멤버 선택 (최대 5명)
          </label>
          {hasMembers ? (
            <>
              <div className="flex flex-col gap-2">
                {availableMembers.map((member) => (
                  <label
                    key={member.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      selectedMembers.includes(member.id)
                        ? "border-primary bg-primary/5"
                        : "border-black-30 hover:bg-black-5"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.id)}
                      onChange={() => handleMemberToggle(member.id)}
                      className="w-5 h-5 rounded border-black-30 text-primary focus:ring-0 focus:ring-offset-0"
                    />
                    <div className="flex-1 text-15-medium text-black-100">
                      {member.name} | 만 {calculateAge(member.birthYear)}세 (
                      {member.birthYear}년생)
                    </div>
                  </label>
                ))}
              </div>
              <div className="text-12-regular text-black-60">
                {selectedMembers.length}/5명 선택됨
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-black-30 bg-black-5 px-4 py-3 text-15-regular text-black-70">
              먼저 아동을 추가해주세요.
            </div>
          )}
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={() => {
              handleReset();
              closeModal();
            }}
            className="flex-1 rounded-lg border border-black-30 px-4 py-3 text-title-14-semibold text-black-70 transition hover:bg-black-10"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className={`flex-1 rounded-lg px-4 py-3 text-title-14-semibold text-white-100 transition ${
              isSubmitDisabled
                ? "bg-black-40 cursor-not-allowed"
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            추가하기
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

export default AddGroupModal;
