interface DesignPaperProps {
  pageId: string;
  orientation: "horizontal" | "vertical";
}

const DesignPaper = ({ pageId, orientation }: DesignPaperProps) => {
  // A4 용지 비율: 210mm x 297mm = 1 : 1.414
  const isHorizontal = orientation === "horizontal";

  return (
    <div
      className={`flex bg-white shrink-0 shadow-lg m-auto ${
        isHorizontal
          ? "min-w-[297mm] min-h-[210mm]"
          : "min-w-[210mm] min-h-[297mm]"
      }`}
      data-page-id={pageId}
    ></div>
  );
};

export default DesignPaper;
