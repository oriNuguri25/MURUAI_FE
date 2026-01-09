import { useState, useEffect, useCallback } from "react";

interface UseNumberInputOptions {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

/**
 * 숫자 입력 필드를 관리하는 커스텀 훅
 * 검증, 포맷팅, 편집 상태 관리를 제공
 *
 * @example
 * const widthInput = useNumberInput({
 *   value: width,
 *   min: 1,
 *   max: 1000,
 *   onChange: handleWidthChange,
 * });
 *
 * <input
 *   value={widthInput.displayValue}
 *   onChange={(e) => widthInput.handleChange(e.target.value)}
 *   onBlur={widthInput.handleBlur}
 *   onFocus={widthInput.handleFocus}
 *   onKeyDown={(e) => e.key === 'Enter' && widthInput.commit()}
 * />
 */
export const useNumberInput = ({
  value,
  min,
  max,
  onChange,
}: UseNumberInputOptions) => {
  const [inputValue, setInputValue] = useState(() => String(Math.round(value)));
  const [isEditing, setIsEditing] = useState(false);

  // 외부 value 변경 시 동기화
  useEffect(() => {
    if (!isEditing) {
      setInputValue(String(Math.round(value)));
    }
  }, [value, isEditing]);

  // 값 제한
  const clamp = useCallback(
    (num: number): number => {
      let result = num;
      if (typeof min === "number") result = Math.max(min, result);
      if (typeof max === "number") result = Math.min(max, result);
      return result;
    },
    [min, max]
  );

  // 입력값 커밋
  const commit = useCallback(() => {
    const digits = inputValue.replace(/[^0-9]/g, "");
    if (!digits) {
      setInputValue(String(Math.round(value)));
      return;
    }
    const nextValue = clamp(Number(digits));
    setInputValue(String(Math.round(nextValue)));
    if (nextValue !== value) {
      onChange(nextValue);
    }
  }, [inputValue, value, clamp, onChange]);

  // 입력값 변경
  const handleChange = useCallback((newValue: string) => {
    const digits = newValue.replace(/[^0-9]/g, "");
    setInputValue(digits);
  }, []);

  // 포커스
  const handleFocus = useCallback(
    (event?: React.FocusEvent<HTMLInputElement>) => {
      setInputValue(String(Math.round(value)));
      setIsEditing(true);
      event?.target.select();
    },
    [value]
  );

  // 블러
  const handleBlur = useCallback(() => {
    if (!isEditing) return;
    setIsEditing(false);
    commit();
  }, [isEditing, commit]);

  // 증감 (+/- 버튼용)
  const step = useCallback(
    (delta: number) => {
      const nextValue = clamp(value + delta);
      onChange(nextValue);
      if (isEditing) {
        setInputValue(String(Math.round(nextValue)));
      }
    },
    [value, clamp, onChange, isEditing]
  );

  return {
    displayValue: isEditing ? inputValue : String(Math.round(value)),
    inputValue,
    isEditing,
    handleChange,
    handleFocus,
    handleBlur,
    commit,
    step,
  };
};
