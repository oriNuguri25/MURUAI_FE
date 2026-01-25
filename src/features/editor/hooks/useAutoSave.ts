import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/shared/supabase/supabase";
import { updateUserMadeVersion } from "../utils/userMadeExport";
import type { Page } from "../model/pageTypes";

type AutoSaveParams = {
  pages: Page[];
  docId?: string | null;
  docName: string;
  onSaveStateChange?: (state: "saving" | "saved" | "error") => void;
};

export type SaveState = "saving" | "saved" | "error";

export const useAutoSave = ({
  pages,
  docId,
  docName,
  onSaveStateChange,
}: AutoSaveParams) => {
  const [saveState, setSaveState] = useState<SaveState | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const lastPagesRef = useRef(pages);
  const clientRevisionRef = useRef(0);

  const performSave = useCallback(async () => {
    if (!docId) {
      setSaveState(null);
      onSaveStateChange?.(null);
      return;
    }
    const myRevision = ++clientRevisionRef.current;

    try {
      setSaveState("saving");
      onSaveStateChange?.("saving");
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        if (myRevision === clientRevisionRef.current) {
          setSaveState(null);
          onSaveStateChange?.(null);
        }
        return;
      }

      await updateUserMadeVersion({
        docId,
        name: docName || "제목 없음",
        canvasData: { pages: lastPagesRef.current },
      });

      if (myRevision !== clientRevisionRef.current) return;
      setSaveState("saved");
      onSaveStateChange?.("saved");
    } catch (error) {
      if (myRevision !== clientRevisionRef.current) return;
      console.error("Auto-save failed:", error);
      setSaveState("error");
      onSaveStateChange?.("error");
    }
  }, [docId, docName, onSaveStateChange]);

  useEffect(() => {
    if (!docId) {
      setSaveState(null);
      onSaveStateChange?.(null);
      return;
    }
    lastPagesRef.current = pages;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(performSave, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [pages, docId, docName, performSave]);

  const retrySave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    performSave();
  }, [performSave]);

  return { saveState, retrySave };
};
