import { images } from "@/shared/assets";
import { useModalStore } from "@/shared/store/useModalStore";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { useAuth } from "@/shared/hooks/useAuth";

const Header = () => {
  const { openAuthModal } = useModalStore();
  const { isAuthenticated } = useAuthStore();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="flex w-full h-18 px-15 justify-between items-center border-b border-b-black-25">
      <div className="flex items-center justify-center">
        <img src={images.mainLogo} alt="Main Logo" className="w-40 h-auto" />
      </div>

      <div className="flex h-10 items-center justify-center gap-2">
        {isAuthenticated ? (
          <>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center justify-center px-4 py-2 border border-black-25 rounded-xl hover:bg-black-10 transition cursor-pointer"
            >
              <span className="text-14-semibold text-black-100">로그아웃</span>
            </button>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
