const FirstCommentSection = () => {
  return (
    <section className="flex flex-col w-full px-10 py-25">
      <div className="flex flex-col w-full gap-10 items-center justify-center">
        <div className="flex flex-col items-center justify-center">
          <span className="flex text-headline-42-bold items-center justify-center text-center">
            수업 준비를 무루아이와
            <br /> 함께 시작해볼까요?
          </span>
        </div>

        <div className="flex w-full items-center justify-center gap-4">
          <div className="flex w-50 h-14 items-center justify-center rounded-xl bg-primary cursor-pointer">
            <span className="text-18-title-semibold text-white-100">
              바로 만들어보기
            </span>
          </div>
          <div className="flex w-50 h-14 items-center justify-center border border-primary rounded-xl cursor-pointer">
            <span className="text-18-title-semibold text-primary">
              내 학습자료
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FirstCommentSection;
