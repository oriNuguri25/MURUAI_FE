import { Calendar, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { getWeekDays, getWeekRange } from "../utils/dateUtils";
import { useModalStore } from "@/shared/store/useModalStore";

const CalendarSection = () => {
  const [weekOffset, setWeekOffset] = useState(0);
  const { openAddScheduleModal } = useModalStore();

  const days = getWeekDays(weekOffset);

  // 시간 라벨 (08:00 ~ 20:00)
  const timeLabels = Array.from({ length: 13 }, (_, i) => {
    const hour = 8 + i;
    return `${hour.toString().padStart(2, "0")}:00`;
  });

  // 타임 슬롯 박스 (12개)
  const timeSlots = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="flex flex-col w-full p-10 gap-10">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 items-center">
          <div className="flex p-3 items-center justify-center bg-[#5500ff]/10 rounded-xl">
            <Calendar className="icons-m text-primary" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="flex text-headline-22-bold items-center text-black-100">
              주간 수업 계획표
            </span>
            <span className="flex text-title-18-semibold items-center text-black-80 tabular-nums">
              {getWeekRange(weekOffset)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* 주 변경 버튼 */}
          <div className="flex items-center shadow-sm rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="flex items-center justify-center px-3 py-2 border border-black-30 text-black-70 bg-white-100 transition hover:bg-black-10 hover:text-black-100"
              aria-label="이전 주"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className="px-4 py-2 border-t border-b border-black-30 text-title-14-semibold text-black-70 bg-white-100 transition hover:bg-black-10 hover:text-black-100"
            >
              오늘
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="flex items-center justify-center px-3 py-2 border border-black-30 text-black-70 bg-white-100 transition hover:bg-black-10 hover:text-black-100"
              aria-label="다음 주"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* 일정 등록 버튼 */}
          <button
            type="button"
            onClick={openAddScheduleModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white-100 text-title-14-semibold shadow-md transition hover:bg-primary/90 hover:shadow-lg"
          >
            <Plus className="h-5 w-5" />
            일정 등록
          </button>
        </div>
      </div>

      {/* 타임테이블 */}
      <div className="flex w-full overflow-auto rounded-2xl border border-black-30 bg-white-100">
        {/* 시간 레이블 영역 */}
        <div className="sticky left-0 z-10 flex w-20 shrink-0 flex-col border-r border-black-20 bg-white-100">
          {/* 헤더 (빈 공간) */}
          <div className="h-14" />
          {/* 상단 여백 */}
          <div className="h-4" />
          {/* 시간 라벨 (12개 박스의 시작점) */}
          {timeSlots.map((_, timeIndex) => (
            <div key={timeIndex} className="relative h-16">
              <span className="absolute top-0 right-2 -translate-y-1/2 text-title-16-semibold text-black-60 tabular-nums">
                {timeLabels[timeIndex]}
              </span>
            </div>
          ))}
          {/* 마지막 시간 라벨 (20:00) */}
          <div className="relative h-0">
            <span className="absolute top-0 right-2 -translate-y-1/2 text-title-16-semibold text-black-60 tabular-nums">
              {timeLabels[12]}
            </span>
          </div>
          {/* 하단 여백 */}
          <div className="h-8" />
        </div>

        {/* 요일 및 타임 그리드 영역 */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 헤더 (요일 및 날짜) */}
          <div className="grid grid-cols-7 border-b border-black-20">
            {days.map((day, index) => (
              <div
                key={index}
                className="flex h-14 items-center justify-center border-r border-black-20 last:border-r-0"
              >
                <span className="text-title-16-semibold text-black-100 tabular-nums">
                  {day.day} {day.date}
                </span>
              </div>
            ))}
          </div>

          {/* 상단 여백 */}
          <div className="grid grid-cols-7 h-4 border-b border-black-20">
            {days.map((_, dayIndex) => (
              <div
                key={dayIndex}
                className="border-r border-black-20 last:border-r-0"
              />
            ))}
          </div>

          {/* 타임 슬롯 박스 (12개) */}
          <div className="relative">
            {timeSlots.map((_, timeIndex) => (
              <div
                key={timeIndex}
                className="grid grid-cols-7 h-16 border-b border-black-20"
              >
                {days.map((_, dayIndex) => (
                  <div
                    key={dayIndex}
                    className="cursor-pointer border-r border-black-20 transition hover:bg-black-5 last:border-r-0"
                  />
                ))}
              </div>
            ))}
          </div>

          {/* 하단 여백 */}
          <div className="grid grid-cols-7 h-8">
            {days.map((_, dayIndex) => (
              <div
                key={dayIndex}
                className="border-r border-black-20 last:border-r-0"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarSection;
