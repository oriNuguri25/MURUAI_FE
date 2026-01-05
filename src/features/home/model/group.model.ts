import { supabase } from "@/shared/supabase/supabase";
import type { Student } from "./student.model";

export interface GroupMember {
  group_id?: string;
  student_id: string;
  students_n?: Pick<Student, "id" | "name" | "birth_year">[] | Pick<Student, "id" | "name" | "birth_year"> | null;
}

export interface Group {
  id: string;
  owner_id: string;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  groups_members_n?: GroupMember[];
}

export interface CreateGroupInput {
  name: string;
  description?: string;
  memberIds: string[];
}

export const groupModel = {
  async create(
    input: CreateGroupInput
  ): Promise<{ data: Group | null; error: Error | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("로그인이 필요합니다.");
      }

      const { data: group, error: groupError } = await supabase
        .from("groups_n")
        .insert([
          {
            owner_id: user.id,
            name: input.name,
            description: input.description || null,
          },
        ])
        .select("id, owner_id, name, description, created_at")
        .single();

      if (groupError) throw groupError;

      if (input.memberIds.length > 0) {
        const memberRows = input.memberIds.map((studentId) => ({
          group_id: group.id,
          student_id: studentId,
        }));

        const { error: membersError } = await supabase
          .from("groups_members_n")
          .insert(memberRows);

        if (membersError) {
          await supabase.from("groups_n").delete().eq("id", group.id);
          throw membersError;
        }
      }

      return { data: group, error: null };
    } catch (err) {
      return {
        data: null,
        error:
          err instanceof Error ? err : new Error("그룹 추가에 실패했습니다."),
      };
    }
  },

  async getAll(): Promise<{ data: Group[] | null; error: Error | null }> {
    try {
      // getUser() 대신 getSession() 사용으로 속도 개선
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        throw new Error("로그인이 필요합니다.");
      }

      const { data, error } = await supabase
        .from("groups_n")
        .select(
          "id, owner_id, name, description, created_at, groups_members_n(student_id, students_n(id, name, birth_year))"
        )
        .eq("owner_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return { data: data as Group[], error: null };
    } catch (err) {
      return {
        data: null,
        error:
          err instanceof Error
            ? err
            : new Error("그룹 목록을 불러오는데 실패했습니다."),
      };
    }
  },
};
