/**
 * 주간 날짜 데이터를 생성하는 함수
 * @param offset - 현재 주로부터의 오프셋 (0: 현재 주, 1: 다음 주, -1: 이전 주)
 * @returns 월요일부터 일요일까지의 요일과 날짜 배열
 */
export const getWeekDays = (offset: number) => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0(일) ~ 6(토)
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 월요일까지의 오프셋

  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset + offset * 7);

  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const days = [];

  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);

    const dayIndex = current.getDay();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const date = String(current.getDate()).padStart(2, "0");

    days.push({
      day: dayNames[dayIndex],
      date: `${month}.${date}`,
    });
  }

  return days;
};

/**
 * 주간 범위 텍스트를 생성하는 함수
 * @param offset - 현재 주로부터의 오프셋 (0: 현재 주, 1: 다음 주, -1: 이전 주)
 * @returns "YYYY.MM.DD(요일) ~ YYYY.MM.DD(요일)" 형식의 문자열
 */
export const getWeekRange = (offset: number) => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset + offset * 7);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const dayName = dayNames[date.getDay()];
    return `${year}.${month}.${day}(${dayName})`;
  };

  return `${formatDate(monday)} ~ ${formatDate(sunday)}`;
};
