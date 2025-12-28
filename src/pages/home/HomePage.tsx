import ChoiceUserSection from "@/features/home/sections/ChoiceUserSection";
import FirstCommentSection from "@/features/home/sections/FirstCommentSection";
import AddUserModal from "@/features/home/components/AddUserModal";
import AddGroupModal from "@/features/home/components/AddGroupModal";
import AddScheduleModal from "@/features/home/components/AddScheduleModal";
import CalendarSection from "@/features/home/sections/CalendarSection";
import AuthModal from "@/shared/components/AuthModal";

const HomePage = () => {
  return (
    <>
      <div className="flex w-full px-10">
        <div className="flex flex-col w-full">
          {/* 상단 코멘트 영역 */}
          <FirstCommentSection />

          {/* 학습자 선택 영역 */}
          <ChoiceUserSection />

          {/* 주간 수업 계획표 영역 */}
          <CalendarSection />
        </div>
      </div>

      <AddUserModal />
      <AddGroupModal />
      <AddScheduleModal />
      <AuthModal />
    </>
  );
};

export default HomePage;
