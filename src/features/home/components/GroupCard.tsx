const GroupCard = () => {
  return (
    <div className="flex flex-col h-85 rounded-xl border border-black-30 p-3 gap-2">
      <div className="flex min-w-0 flex-col text-start gap-0.5 shrink-0">
        <span className="w-full overflow-hidden text-ellipsis text-title-18-semibold text-black-100 line-clamp-2">
          그룹이름테스트입니다.
        </span>
        <span className="w-full overflow-hidden text-ellipsis text-14-semibold text-black-70 line-clamp-2">
          그룹 설명이 들어올 자리입니다.
        </span>
      </div>

      <div className="flex text-start shrink-0">
        <span className="flex text-title-16-semibold text-black-100">
          멤버 (총 4명)
        </span>
      </div>

      <div className="flex w-full flex-1 min-h-0 rounded-xl bg-[#5500ff]/10 p-2">
        <div className="grid grid-rows-5 w-full h-full gap-1.5">
          <div className="flex items-center gap-2 rounded-lg border border-black-20 bg-white-100 px-2 py-1.5 shadow-sm min-h-0">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
              aria-hidden="true"
            />
            <span className="text-13-regular text-black-100">김하린</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-black-20 bg-white-100 px-2 py-1.5 shadow-sm min-h-0">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
              aria-hidden="true"
            />
            <span className="text-13-regular text-black-100">이서준</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-black-20 bg-white-100 px-2 py-1.5 shadow-sm min-h-0">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
              aria-hidden="true"
            />
            <span className="text-13-regular text-black-100">박지우</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-black-20 bg-white-100 px-2 py-1.5 shadow-sm min-h-0">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
              aria-hidden="true"
            />
            <span className="text-13-regular text-black-100">최유나</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupCard;
