import { useEffect } from "react";
import { supabase } from "@/shared/supabase/supabase";
import { updateUserMadeVersion } from "../utils/userMadeExport";
import type { Page } from "../model/pageTypes";

type AutoSaveParams = {
  pages: Page[];
  docId?: string | null;
  docName: string;
};

export const useAutoSave = ({ pages, docId, docName }: AutoSaveParams) => {
  useEffect(() => {
    if (!docId) return;
    const autoSaveTimeout = setTimeout(async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (!user) return;

        await updateUserMadeVersion({
          docId,
          name: docName || "제목 없음",
          canvasData: { pages },
        });
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    }, 1000);

    return () => { clearTimeout(autoSaveTimeout); };
  }, [pages, docId, docName]);
};
