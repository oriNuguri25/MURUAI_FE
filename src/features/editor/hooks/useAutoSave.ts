import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/shared/supabase/supabase";
import { updateUserMadeVersion } from "../utils/userMadeExport";
import type { Page } from "../model/pageTypes";

export type SaveState = "saving" | "saved" | "error";

type AutoSaveParams = {
  pages: Page[];
  docId?: string | null;
  docName: string;
  // ✅ null도 전달하므로 타입에 포함
  onSaveStateChange?: (state: SaveState | null) => void;
};

export const useAutoSave = ({
  pages,
  docId,
  docName,
  onSaveStateChange,
}: AutoSaveParams) => {
  const [saveState, setSaveState] = useState<SaveState | null>(null);

  // ✅ setTimeout 타입 안정화 (Node/DOM 혼재 방지)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastPagesRef = useRef(pages);
  const clientRevisionRef = useRef(0);

  // ✅ deps 경고 방지 + 불필요한 재생성 방지: callback은 ref로 보관
  const onSaveStateChangeRef = useRef(onSaveStateChange);
  useEffect(() => {
    onSaveStateChangeRef.current = onSaveStateChange;
  }, [onSaveStateChange]);

  const emitSaveState = (state: SaveState | null) => {
    onSaveStateChangeRef.current?.(state);
  };

  const performSave = useCallback(async () => {
    if (!docId) {
      // docId가 없으면 저장 대상 없음 (UI는 파생값으로 null 처리)
      return;
    }

    const myRevision = ++clientRevisionRef.current;

    try {
      setSaveState("saving");
      emitSaveState("saving");

      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        // 최신 요청일 때만 상태 반영
        if (myRevision === clientRevisionRef.current) {
          setSaveState(null);
          emitSaveState(null);
        }
        return;
      }

      await updateUserMadeVersion({
        docId,
        name: docName || "제목 없음",
        canvasData: { pages: lastPagesRef.current },
      });

      // ✅ 레이스 방지: 최신 저장만 반영
      if (myRevision !== clientRevisionRef.current) return;

      setSaveState("saved");
      emitSaveState("saved");
    } catch (error) {
      if (myRevision !== clientRevisionRef.current) return;

      console.error("Auto-save failed:", error);
      setSaveState("error");
      emitSaveState("error");
    }
  }, [docId, docName]);

  useEffect(() => {
    lastPagesRef.current = pages;

    // 기존 타이머 정리
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    // ✅ docId가 없으면 "동기 setState in effect"를 피해서 비동기로 reset
    if (!docId) {
      const t = setTimeout(() => {
        setSaveState(null);
        emitSaveState(null);
      }, 0);

      return () => clearTimeout(t);
    }

    // 1초 디바운스 저장(현재 로직 유지)
    saveTimeoutRef.current = setTimeout(performSave, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [pages, docId, docName, performSave]);

  const retrySave = useCallback(() => {
    if (!docId) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    performSave();
  }, [docId, performSave]);

  // ✅ docId가 없으면 UI에는 항상 null로 보이게(파생값)
  const effectiveSaveState = docId ? saveState : null;

  return { saveState: effectiveSaveState, retrySave };
};
