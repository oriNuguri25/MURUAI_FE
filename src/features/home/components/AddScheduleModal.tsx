import { Calendar } from "lucide-react";
import { useState } from "react";
import { useModalStore } from "@/shared/store/useModalStore";
import BaseModal from "@/shared/ui/BaseModal";

interface Student {
  id: number;
  name: string;
}

interface Group {
  id: number;
  name: string;
}

const AddScheduleModal = () => {
  const { openModal, closeModal } = useModalStore();
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isRepeating, setIsRepeating] = useState(false);
  const [repeatEndDate, setRepeatEndDate] = useState("");
  const [targetType, setTargetType] = useState<"individual" | "group">(
    "individual"
  );
  const [selectedTarget, setSelectedTarget] = useState("");

  const isOpen = openModal === "addSchedule";

  const handleReset = () => {
    setTitle("");
    setStartDate("");
    setEndDate("");
    setStartTime("");
    setEndTime("");
    setIsRepeating(false);
    setRepeatEndDate("");
    setTargetType("individual");
    setSelectedTarget("");
  };

  // 시간 옵션 생성 (08:00 ~ 20:00, 30분 단위)
  const timeOptions = (() => {
    const options = [];
    for (let hour = 8; hour <= 20; hour++) {
      options.push(`${hour.toString().padStart(2, "0")}:00`);
      if (hour < 20) {
        options.push(`${hour.toString().padStart(2, "0")}:30`);
      }
    }
    return options;
  })();

  // 종료 시간 옵션 (시작 시간 이후만)
  const endTimeOptions = (() => {
    if (!startTime || !startDate || !endDate) return timeOptions;

    // 시작일과 종료일이 같은 경우에만 시작 시간 이후로 제한
    if (startDate === endDate) {
      const startIndex = timeOptions.indexOf(startTime);
      return timeOptions.slice(startIndex + 1);
    }

    // 종료일이 시작일보다 나중이면 모든 시간 선택 가능
    return timeOptions;
  })();

  // TODO: 실제 데이터는 API에서 가져와야 함
  const students: Student[] = [];
  const groups: Group[] = [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: 일정 추가 로직
    console.log({
      title,
      startDate,
      endDate,
      startTime,
      endTime,
      isRepeating,
      repeatEndDate,
      targetType,
      selectedTarget,
    });
    handleReset();
    closeModal();
  };

  const isSubmitDisabled =
    !title.trim() ||
    !startDate ||
    !endDate ||
    !startTime ||
    !endTime ||
    !selectedTarget ||
    (isRepeating && !repeatEndDate);

  const targetList = targetType === "individual" ? students : groups;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={closeModal}
      onReset={handleReset}
      title={
        <h2 className="flex items-center gap-2 text-title-20-semibold text-black-100">
          <Calendar className="h-5 w-5 text-primary" />새 일정 추가
        </h2>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* 제목 */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="title"
            className="text-title-14-semibold text-black-100"
          >
            제목
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-lg border border-black-30 px-4 py-3 text-15-regular text-black-100 transition focus:border-primary focus:outline-none"
            placeholder="제목을 입력하세요"
            required
          />
        </div>

        {/* 날짜 및 시간 */}
        <div className="flex flex-col gap-2">
          <label className="text-title-14-semibold text-black-100">
            날짜 및 시간
          </label>

          {/* 시작 */}
          <div className="flex gap-2 items-center">
            <span className="text-15-regular text-black-70 w-12">시작</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 rounded-lg border border-black-30 px-4 py-3 text-15-regular text-black-100 transition focus:border-primary focus:outline-none"
              required
            />
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="flex-1 rounded-lg border border-black-30 px-4 py-3 text-15-regular text-black-100 transition focus:border-primary focus:outline-none"
              required
            >
              <option value="">시간 선택</option>
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>

          {/* 종료 */}
          <div className="flex gap-2 items-center">
            <span className="text-15-regular text-black-70 w-12">종료</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="flex-1 rounded-lg border border-black-30 px-4 py-3 text-15-regular text-black-100 transition focus:border-primary focus:outline-none"
              required
            />
            <select
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="flex-1 rounded-lg border border-black-30 px-4 py-3 text-15-regular text-black-100 transition focus:border-primary focus:outline-none"
              disabled={!startTime || !startDate || !endDate}
              required
            >
              <option value="">시간 선택</option>
              {endTimeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 매주 반복 */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isRepeating}
              onChange={(e) => {
                setIsRepeating(e.target.checked);
                if (!e.target.checked) {
                  setRepeatEndDate("");
                }
              }}
              className="w-4 h-4 rounded border-black-30 text-primary transition focus:ring-2 focus:ring-primary focus:ring-offset-0"
            />
            <span className="text-15-regular text-black-100">매주 반복</span>
          </label>

          {isRepeating && (
            <div className="flex gap-2 items-center ml-6">
              <span className="text-15-regular text-black-70 w-16">종료일</span>
              <input
                type="date"
                value={repeatEndDate}
                onChange={(e) => setRepeatEndDate(e.target.value)}
                min={startDate}
                className="flex-1 rounded-lg border border-black-30 px-4 py-3 text-15-regular text-black-100 transition focus:border-primary focus:outline-none"
                required={isRepeating}
              />
            </div>
          )}
        </div>

        {/* 수업 대상 */}
        <div className="flex flex-col gap-2">
          <label className="text-title-14-semibold text-black-100">
            수업 대상
          </label>

          {/* 대상 타입 선택 */}
          <div className="flex items-center gap-1 rounded-full border border-black-20 bg-black-10 p-1">
            <button
              type="button"
              onClick={() => {
                setTargetType("individual");
                setSelectedTarget("");
              }}
              className={`flex-1 rounded-full px-4 py-2 text-title-14-semibold transition ${
                targetType === "individual"
                  ? "bg-linear-to-br from-[#5500ff]/40 to-[#7700ff]/40 text-black-100 shadow-sm"
                  : "text-black-70 hover:bg-black-15"
              }`}
            >
              개별 아동
            </button>
            <button
              type="button"
              onClick={() => {
                setTargetType("group");
                setSelectedTarget("");
              }}
              className={`flex-1 rounded-full px-4 py-2 text-title-14-semibold transition ${
                targetType === "group"
                  ? "bg-linear-to-br from-[#5500ff]/40 to-[#7700ff]/40 text-black-100 shadow-sm"
                  : "text-black-70 hover:bg-black-15"
              }`}
            >
              그룹 수업
            </button>
          </div>

          {/* 대상 선택 드롭다운 */}
          <select
            value={selectedTarget}
            onChange={(e) => setSelectedTarget(e.target.value)}
            className="rounded-lg border border-black-30 px-4 py-3 text-15-regular text-black-100 transition focus:border-primary focus:outline-none disabled:bg-black-5 disabled:text-black-60 disabled:cursor-not-allowed"
            disabled={targetList.length === 0}
            required
          >
            <option value="">
              {targetList.length === 0
                ? targetType === "individual"
                  ? "먼저 아동을 추가해주세요"
                  : "먼저 그룹을 추가해주세요"
                : targetType === "individual"
                ? "아동을 선택하세요"
                : "그룹을 선택하세요"}
            </option>
            {targetList.map((target) => (
              <option key={target.id} value={target.id}>
                {target.name}
              </option>
            ))}
          </select>
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

export default AddScheduleModal;
