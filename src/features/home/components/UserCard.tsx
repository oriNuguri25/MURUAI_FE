const UserCard = () => {
  return (
    <div className="flex flex-col h-85 rounded-xl border border-black-30 p-4 gap-4">
      <div className="flex flex-col text-start gap-1">
        <span className="flex text-title-20-semibold text-black">팜하니</span>
        <span className="flex text-title-14-semibold text-black-70">
          만 6세 · 2018년생
        </span>
      </div>

      <div className="flex text-start">
        <span className="flex text-14-semibold text-black-100">
          아동 정보 카드
        </span>
      </div>

      <div className="grid grid-rows-2 gap-2 w-full h-full">
        <div className="flex flex-col p-3 gap-1 rounded-xl w-full bg-[#5500ff]/10">
          <div className="flex text-start items-center">
            <span className="flex text-title-14-semibold text-black-80">
              특이사항
            </span>
          </div>

          <div className="flex text-start items-center">
            <span className="flex text-12-regular text-black-100">
              낯선 환경에 예민함, 시각 자료 선호
            </span>
          </div>
        </div>

        <div className="flex flex-col p-3 gap-1 rounded-xl w-full bg-[#5500ff]/10">
          <div className="flex text-start items-center">
            <span className="flex text-title-14-semibold text-black-80">
              학습목표
            </span>
          </div>

          <div className="flex text-start items-center">
            <span className="flex text-12-regular text-black-100">
              기본 발음 교정 및 문장 구성 연습
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserCard;
