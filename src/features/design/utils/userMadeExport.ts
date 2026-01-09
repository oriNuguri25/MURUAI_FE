import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { supabase } from "@/shared/supabase/supabase";

type SaveUserMadeOptions = {
  userId: string;
  name: string;
  canvasData: unknown;
};

type AssignTargetOptions = {
  userMadeId: string;
  targetType: "child" | "group";
  targetId: string;
};

export const saveUserMadeVersion = async ({
  userId,
  name,
  canvasData,
}: SaveUserMadeOptions): Promise<{ id: string }> => {
  if (!userId) {
    console.error("saveUserMadeVersion: missing userId");
  }
  if (!name) {
    console.warn("saveUserMadeVersion: empty name");
  }
  if (canvasData == null) {
    console.error("saveUserMadeVersion: missing canvasData", canvasData);
  }

  const payload = {
    user_id: userId,
    name,
    canvas_data: canvasData,
  };

  const { data, error } = await supabase
    .from("user_made_n")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data) {
    console.error("saveUserMadeVersion failed", {
      error,
      hasUserId: Boolean(userId),
      name,
      canvasDataType: typeof canvasData,
      payloadKeys: Object.keys(payload),
    });
    throw error ?? new Error("Failed to save user_made_n");
  }

  return { id: data.id };
};

type UpdateUserMadeOptions = {
  docId: string;
  name: string;
  canvasData: unknown;
};

export const updateUserMadeVersion = async ({
  docId,
  name,
  canvasData,
}: UpdateUserMadeOptions): Promise<void> => {
  if (!docId) {
    console.error("updateUserMadeVersion: missing docId");
    throw new Error("Missing document ID");
  }
  if (!name) {
    console.warn("updateUserMadeVersion: empty name");
  }
  if (canvasData == null) {
    console.error("updateUserMadeVersion: missing canvasData", canvasData);
  }

  const payload = {
    name,
    canvas_data: canvasData,
  };

  const { error } = await supabase
    .from("user_made_n")
    .update(payload)
    .eq("id", docId);

  if (error) {
    console.error("updateUserMadeVersion failed", {
      error,
      docId,
      name,
      canvasDataType: typeof canvasData,
    });
    throw error;
  }
};

export const assignUserMadeToTarget = async ({
  userMadeId,
  targetType,
  targetId,
}: AssignTargetOptions): Promise<void> => {
  const payload =
    targetType === "child"
      ? { user_made_id: userMadeId, child_id: targetId }
      : { user_made_id: userMadeId, group_id: targetId };

  const { error } = await supabase.from("user_made_targets_n").insert(payload);

  if (error) {
    throw error;
  }
};

export const generatePdfFromDomPages = async ({
  quality = 2,
}: {
  quality?: number;
} = {}): Promise<Blob> => {
  const pages = Array.from(document.querySelectorAll<HTMLElement>(".pdf-page"));
  if (pages.length === 0) {
    throw new Error("No .pdf-page elements found");
  }

  const getPageSize = (orientation: "horizontal" | "vertical") =>
    orientation === "horizontal"
      ? { width: 297, height: 210 }
      : { width: 210, height: 297 };

  const resolveOrientation = (page: HTMLElement): "horizontal" | "vertical" => {
    const datasetOrientation = page.dataset.orientation;
    if (datasetOrientation === "horizontal") return "horizontal";
    if (datasetOrientation === "vertical") return "vertical";
    const rect = page.getBoundingClientRect();
    return rect.width > rect.height ? "horizontal" : "vertical";
  };

  const firstOrientation = resolveOrientation(pages[0]);
  const firstSize = getPageSize(firstOrientation);
  const pdf = new jsPDF({
    unit: "mm",
    format: [firstSize.width, firstSize.height],
    orientation: firstSize.width > firstSize.height ? "landscape" : "portrait",
  });
  const imageQuality = 0.7;

  for (let i = 0; i < pages.length; i += 1) {
    const orientation = resolveOrientation(pages[i]);
    const { width: pdfW, height: pdfH } = getPageSize(orientation);

    const canvas = await html2canvas(pages[i], {
      scale: quality,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const imgData = canvas.toDataURL("image/jpeg", imageQuality);
    const props = pdf.getImageProperties(imgData);

    let w = pdfW;
    let h = (props.height * w) / props.width;
    if (h > pdfH) {
      h = pdfH;
      w = (props.width * h) / props.height;
    }
    const x = (pdfW - w) / 2;
    const y = 0;

    if (i > 0) {
      pdf.addPage([pdfW, pdfH], pdfW > pdfH ? "landscape" : "portrait");
    }
    pdf.addImage(imgData, "JPEG", x, y, w, h);
  }

  return pdf.output("blob");
};

export const downloadBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
