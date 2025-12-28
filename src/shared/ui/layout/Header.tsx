import { images } from "@/shared/assets";
import { useModalStore } from "@/shared/store/useModalStore";

const Header = () => {
  const { openAuthModal } = useModalStore();

  return (
    <header className="flex w-full h-18 px-15 justify-between items-center border-b border-b-black-25">
      <div className="flex items-center justify-center">
        <img src={images.mainLogo} alt="Main Logo" className="w-40 h-auto" />
      </div>

      <div className="flex h-10 items-center justify-center gap-2">
        <button
          type="button"
          onClick={openAuthModal}
          className="flex items-center justify-center p-4 cursor-pointer"
        >
          <span className="text-14-semibold text-black-100">로그인</span>
        </button>

        <button
          type="button"
          onClick={openAuthModal}
          className="flex h-full items-center justify-center p-4 bg-[#5500ff] rounded-xl cursor-pointer"
        >
          <span className="text-14-semibold text-white-100">가입하기</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
