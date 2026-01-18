import type {
  ClipboardEventHandler,
  FormEventHandler,
  KeyboardEventHandler,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  MutableRefObject,
  RefObject,
} from "react";
import { isTextEmpty } from "../textContentUtils";
import type { TextBoxProps } from "../textBoxTypes";

type UseTextBoxEditingHandlersProps = {
  editable: boolean;
  locked: boolean;
  isEditing: boolean;
  isSelected: boolean;
  text: string;
  richText?: string;
  toolbar?: TextBoxProps["toolbar"];
  onTextChange?: TextBoxProps["onTextChange"];
  onSelectChange?: TextBoxProps["onSelectChange"];
  onStartEditing?: TextBoxProps["onStartEditing"];
  onFinishEditing?: TextBoxProps["onFinishEditing"];
  onRequestDelete?: TextBoxProps["onRequestDelete"];
  isComposingRef: MutableRefObject<boolean>;
  editableRef: RefObject<HTMLDivElement | null>;
};

type BeginEditingOptions = { allowDefault?: boolean };

type BeginEditingEvent =
  | ReactPointerEvent<HTMLDivElement>
  | ReactMouseEvent<HTMLDivElement>;

export const useTextBoxEditingHandlers = ({
  editable,
  locked,
  isEditing,
  isSelected,
  text,
  richText,
  toolbar,
  onTextChange,
  onSelectChange,
  onStartEditing,
  onFinishEditing,
  onRequestDelete,
  isComposingRef,
  editableRef,
}: UseTextBoxEditingHandlersProps) => {
  const beginEditing = (
    event: BeginEditingEvent,
    options?: BeginEditingOptions
  ) => {
    if (!editable || locked) return;
    // Allow native selection when requested.
    if (!options?.allowDefault) {
      event.preventDefault();
    }
    event.stopPropagation();
    if (!isSelected) {
      onSelectChange?.(true, { additive: event.shiftKey });
    }
    // Enter editing without selecting all text.
    onStartEditing?.();
  };

  const applyStyleToSelection = (command: string, value?: string) => {
    if (!isEditing) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    document.execCommand(command, false, value);

    const editableNode = editableRef.current;
    if (!editableNode) return;

    const plainText = editableNode.innerText;
    const html = editableNode.innerHTML;
    onTextChange?.(plainText, html);
  };

  const handleToggleBold = () => {
    if (isEditing) {
      applyStyleToSelection("bold");
    } else {
      toolbar?.onToggleBold();
    }
  };

  const handleToggleUnderline = () => {
    if (isEditing) {
      applyStyleToSelection("underline");
    } else {
      toolbar?.onToggleUnderline();
    }
  };

  const handleColorChange = (color: string) => {
    if (isEditing) {
      applyStyleToSelection("foreColor", color);
    } else {
      toolbar?.onColorChange(color);
    }
  };

  const handleFontSizeChange = (size: number) => {
    if (isEditing) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        toolbar?.onFontSizeChange(size);
        return;
      }

      const range = selection.getRangeAt(0);
      if (range.collapsed) {
        toolbar?.onFontSizeChange(size);
        return;
      }

      const span = document.createElement("span");
      span.style.fontSize = `${size}px`;
      range.surroundContents(span);

      const editableNode = editableRef.current;
      if (!editableNode) return;

      const plainText = editableNode.innerText;
      const html = editableNode.innerHTML;
      onTextChange?.(plainText, html);
    } else {
      toolbar?.onFontSizeChange(size);
    }
  };

  const insertPlainText = (value: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    if (document.queryCommandSupported?.("insertText")) {
      document.execCommand("insertText", false, value);
      return;
    }
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const fragment = document.createDocumentFragment();
    const lines = value.split(/\r?\n/);
    let lastNode: ChildNode | null = null;
    lines.forEach((line, index) => {
      if (index > 0) {
        const br = document.createElement("br");
        fragment.appendChild(br);
        lastNode = br;
      }
      if (line.length > 0) {
        const textNode = document.createTextNode(line);
        fragment.appendChild(textNode);
        lastNode = textNode;
      }
    });
    range.insertNode(fragment);
    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  const handleEditingBlur = () => {
    if (isComposingRef.current) return;
    const editableNode = editableRef.current;
    const nextText = editableNode?.innerText ?? text;
    const nextRichText = editableNode?.innerHTML ?? richText;
    if (isTextEmpty(nextText, nextRichText)) {
      if (onRequestDelete) {
        onRequestDelete();
      } else {
        onFinishEditing?.();
      }
      return;
    }
    onFinishEditing?.();
  };

  const handleInput: FormEventHandler<HTMLDivElement> = (event) => {
    const target = event.currentTarget;
    const plainText = target.innerText;
    const html = target.innerHTML;
    onTextChange?.(plainText, html);
  };

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
    // Skip key handling during IME composition.
    if (event.nativeEvent.isComposing || isComposingRef.current) {
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "u") {
      // Prevent underline shortcuts while editing.
      event.preventDefault();
    }
  };

  const handlePaste: ClipboardEventHandler<HTMLDivElement> = (event) => {
    // Sanitize paste: insert text/plain only.
    event.preventDefault();
    event.stopPropagation();
    const pastedText = event.clipboardData?.getData("text/plain") ?? "";
    if (!pastedText) return;
    insertPlainText(pastedText);
    const editableNode = editableRef.current;
    if (!editableNode) return;
    onTextChange?.(editableNode.innerText, editableNode.innerHTML);
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = () => {
    isComposingRef.current = false;
  };

  return {
    beginEditing,
    handleEditingBlur,
    handleInput,
    handleKeyDown,
    handlePaste,
    handleCompositionStart,
    handleCompositionEnd,
    handleToggleBold,
    handleToggleUnderline,
    handleColorChange,
    handleFontSizeChange,
  };
};
