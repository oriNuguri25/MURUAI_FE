const TextContent = () => {
  return (
    <div className="flex flex-col w-full gap-6 pt-3">
      <div className="flex flex-col gap-4">
        <div className="flex text-title-16-semibold items-center">
          기본 텍스트 스타일
        </div>
        <div className="flex flex-col items-center w-full gap-2">
          <button className="flex w-full rounded-xl border border-black-30 items-center justify-start px-3 py-4">
            <span className="flex text-headline-28-bold">제목 추가</span>
          </button>

          <button className="flex w-full rounded-xl border border-black-30 items-center justify-start px-3 py-4">
            <span className="flex text-title-20-semibold">부제목 추가</span>
          </button>

          <button className="flex w-full rounded-xl border border-black-30 items-center justify-start px-3 py-4">
            <span className="flex text-14-regular">본문 추가</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TextContent;
