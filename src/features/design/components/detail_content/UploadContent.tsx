const UploadContent = () => {
  // 임시로 빈 배열 사용 (나중에 실제 업로드된 파일 데이터로 대체)
  const uploadedFiles: string[] = [];

  return (
    <div className="flex flex-col items-center pt-3 gap-6">
      <div className="flex items-center justify-center w-full px-4 py-3 bg-[#5500ff]/40 rounded-xl">
        <span className="flex text-title-16-semibold text-white-100">
          파일 업로드
        </span>
      </div>

      <div className="flex flex-col w-full gap-3">
        <div className="flex items-center justify-start w-full">
          <span className="flex text-title-14-semibold">
            내가 업로드한 파일
          </span>
        </div>

        {/* 업로드된 파일 목록 영역 */}
        <div className="flex flex-col w-full flex-1 p-4">
          {uploadedFiles.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-body-14-regular text-gray-400">
                아직 업로드된 파일이 없습니다.
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center p-2 bg-gray-50 rounded">
                  <span className="text-body-14-regular">{file}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadContent;
