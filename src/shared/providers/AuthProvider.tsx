import { useEffect } from "react";
import { supabase } from "@/shared/supabase/supabase";
import { useAuthStore } from "@/shared/store/useAuthStore";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { setUser, setLoading, isLoading } = useAuthStore();

  useEffect(() => {
    // 현재 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 인증 상태 변경 리스너
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setLoading]);

  // 로딩 중일 때는 빈 화면 또는 로딩 스피너 표시
  if (isLoading) {
    return null;
  }

  return <>{children}</>;
};
