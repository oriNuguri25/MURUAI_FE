import { supabase } from "@/shared/supabase/supabase";

export interface Student {
  id?: string;
  user_id: string;
  name: string;
  birth_year: string;
  significant?: string;
  learning_goal?: string;
  created_at?: string;
}

export interface CreateStudentInput {
  name: string;
  birth_year: string;
  significant?: string;
  learning_goal?: string;
}

export const studentModel = {
  async create(input: CreateStudentInput): Promise<{ data: Student | null; error: Error | null }> {
    try {
      // 현재 로그인한 사용자 가져오기
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("로그인이 필요합니다.");
      }

      const { data, error } = await supabase
        .from("students_n")
        .insert([
          {
            user_id: user.id,
            name: input.name,
            birth_year: input.birth_year,
            significant: input.significant || null,
            learning_goal: input.learning_goal || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error("아동 추가에 실패했습니다.")
      };
    }
  },

  async getAll(): Promise<{ data: Student[] | null; error: Error | null }> {
    try {
      // getUser() 대신 getSession() 사용으로 속도 개선
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        throw new Error("로그인이 필요합니다.");
      }

      const { data, error } = await supabase
        .from("students_n")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error("아동 목록을 불러오는데 실패했습니다.")
      };
    }
  },

  async delete(id: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from("students_n")
        .delete()
        .eq("id", id);

      if (error) throw error;

      return { error: null };
    } catch (err) {
      return {
        error: err instanceof Error ? err : new Error("아동 삭제에 실패했습니다.")
      };
    }
  },
};
