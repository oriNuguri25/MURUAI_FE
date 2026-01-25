import type { CanvasElement } from "../model/canvasTypes";

type SelectionRenderState = {
  renderSelectedIds: string[];
  selectedGroupId: string | null;
  isGroupedSelection: boolean;
  canGroupSelection: boolean;
  canUngroupSelection: boolean;
  isRenderGroupedSelection: boolean;
  shouldShowIndividualBorder: (elementId: string) => boolean;
};

export const getSelectionRenderState = ({
  elements,
  selectedIds,
  previewSelectedIds,
}: {
  elements: CanvasElement[];
  selectedIds: string[];
  previewSelectedIds?: string[] | null;
}): SelectionRenderState => {
  const renderSelectedIds =
    previewSelectedIds && previewSelectedIds.length > 0
      ? previewSelectedIds
      : selectedIds;

  const selectedGroupId =
    selectedIds.length > 1
      ? elements.find((element) => element.id === selectedIds[0])?.groupId ??
        null
      : null;

  const isGroupedSelection =
    selectedGroupId != null &&
    selectedIds.length > 1 &&
    selectedIds.every(
      (id) =>
        elements.find((element) => element.id === id)?.groupId ===
        selectedGroupId
    );

  const canGroupSelection = selectedIds.length > 1;

  const canUngroupSelection = elements.some(
    (element) => selectedIds.includes(element.id) && element.groupId
  );

  const renderGroupId =
    renderSelectedIds.length > 1
      ? elements.find((element) => element.id === renderSelectedIds[0])
          ?.groupId ?? null
      : null;

  const isRenderGroupedSelection =
    renderGroupId != null &&
    renderSelectedIds.length > 1 &&
    renderSelectedIds.every(
      (id) =>
        elements.find((element) => element.id === id)?.groupId === renderGroupId
    );

  const shouldShowIndividualBorder = (elementId: string) =>
    renderSelectedIds.includes(elementId) &&
    (!isRenderGroupedSelection || renderSelectedIds.length === 1);

  return {
    renderSelectedIds,
    selectedGroupId,
    isGroupedSelection,
    canGroupSelection,
    canUngroupSelection,
    isRenderGroupedSelection,
    shouldShowIndividualBorder,
  };
};
