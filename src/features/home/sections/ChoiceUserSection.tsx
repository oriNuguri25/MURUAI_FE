import { PlusCircleIcon, User, Users } from "lucide-react";
import { useState } from "react";
import UserCard from "../components/UserCard";
import GroupCard from "../components/GroupCard";
import { useModalStore } from "@/shared/store/useModalStore";

const ChoiceUserSection = () => {
  const [lessonType, setLessonType] = useState<"individual" | "group">(
    "individual"
  );
  const { openAddUserModal, openAddGroupModal } = useModalStore();

  return (
    <section className="flex flex-col w-full px-10 gap-10">
      <div className="flex flex-col w-full gap-10 items-center justify-center">
        <div className="flex flex-col itme-center justify-center">
          <span className="flex text-title-22-semibold items-center justify-center text-center">
            개별 아동 또는 그룹 수업을 선택하여 맞춤형 수업 자료를 만들어보세요.
          </span>
        </div>

        <div className="flex w-full items-center justify-center">
          <div className="flex items-center gap-1 rounded-full border border-black-20 bg-black-10 p-1">
            <button
              type="button"
              aria-pressed={lessonType === "individual"}
              className={`flex items-center justify-center gap-2 rounded-full px-5 py-2 text-title-16-semibold cursor-pointer transition ${
                lessonType === "individual"
                  ? "bg-white-100 text-black-100 shadow-sm"
                  : "text-black-70 hover:bg-black-15"
              }`}
              onClick={() => setLessonType("individual")}
            >
              <User className="h-4 w-4" aria-hidden="true" />
              개별 아동
            </button>
            <button
              type="button"
              aria-pressed={lessonType === "group"}
              className={`flex items-center justify-center gap-2 rounded-full px-5 py-2 text-title-16-semibold cursor-pointer transition ${
                lessonType === "group"
                  ? "bg-white-100 text-black-100 shadow-sm"
                  : "text-black-70 hover:bg-black-15"
              }`}
              onClick={() => setLessonType("group")}
            >
              <Users className="h-4 w-4" aria-hidden="true" />
              그룹 수업
            </button>
          </div>
        </div>
      </div>
      <div className="grid w-full h-auto grid-cols-5 gap-5 pb-10">
        {/* 추가하기 버튼 */}
        <button
          type="button"
          onClick={lessonType === "individual" ? openAddUserModal : openAddGroupModal}
          className="group relative flex flex-col h-full rounded-xl items-center justify-center border-2 border-dashed border-black-30 bg-black-5 p-6 transition hover:border-primary hover:shadow-sm cursor-pointer"
        >
          <div className="pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full bg-black-10 opacity-60 blur-2xl" />
          <div className="flex flex-col gap-4 items-center justify-center">
            <PlusCircleIcon className="icon-xl text-black-70 transition group-hover:text-primary" />
            <span className="flex text-title-16-semibold text-black-60 transition group-hover:text-primary">
              {lessonType === "individual" ? "아동 추가하기" : "그룹 추가하기"}
            </span>
          </div>
        </button>

        {lessonType === "individual" ? <UserCard /> : <GroupCard />}
      </div>
    </section>
  );
};

export default ChoiceUserSection;
