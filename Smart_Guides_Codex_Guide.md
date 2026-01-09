# Smart Guides (Canva-style Alignment Guides) – Codex Implementation Guide

## 목적
드래그 중인 요소가 캔버스 또는 다른 요소들과 정렬될 때  
- 시각적인 기준선(Smart Guide)을 표시하고  
- 일정 오차 이내에서는 자동으로 위치를 맞추는(Snap) 기능을 구현한다.

본 지침은 Canva/Figma와 유사한 UX를 목표로 한다.

---

## 핵심 개념 정리

### 용어
- **Smart Guides**: 드래그 중 나타나는 보조 정렬선
- **Snap**: 기준선에 가까워지면 자동으로 위치를 맞추는 동작
- **Key Points**: 정렬 비교에 사용되는 핵심 좌표들

---

## 기준선 표시 우선순위

1. **캔버스 기준**
   - 캔버스 중앙 (centerX, centerY)
   - 캔버스 좌 / 우 / 상 / 하

2. **다른 요소 기준**
   - 다른 요소의 Left / Center / Right
   - 다른 요소의 Top / Middle / Bottom

3. **간격(Spacing) 기준** (선택 구현)
   - 요소 사이 간격이 동일할 때 표시

---

## 정렬에 사용하는 Key Points

각 요소는 다음 6개의 기준점을 가진다.

### X축
- left
- centerX
- right

### Y축
- top
- centerY
- bottom

```ts
const keyPoints = {
  left: x,
  centerX: x + width / 2,
  right: x + width,
  top: y,
  centerY: y + height / 2,
  bottom: y + height,
};
```

---

## Guide / Snap 기준값

```ts
const GUIDE_THRESHOLD = 6; // px – 기준선 표시
const SNAP_THRESHOLD = 3;  // px – 자동 스냅
```

---

## Smart Guide 표시 조건

### 캔버스 기준
- 요소의 centerX == canvas.width / 2
- 요소의 centerY == canvas.height / 2

### 요소 간 정렬
- moving.centerX ≈ target.centerX
- moving.left ≈ target.left
- moving.right ≈ target.right
- moving.top ≈ target.top
- moving.centerY ≈ target.centerY
- moving.bottom ≈ target.bottom

---

## Snap 처리 로직

```ts
if (Math.abs(diff) < SNAP_THRESHOLD) {
  position += diff;
}
```

---

## 드래그 중 처리 순서

1. 현재 드래그 중인 요소의 key points 계산
2. 비교 대상 수집
3. X축 비교
4. Y축 비교
5. 기준선 렌더링 정보 반환

---

## 성능 고려사항

- 드래그 중인 요소는 비교 대상에서 제외
- 회전된 요소는 회전 전 bounding box 기준 사용
- 핵심 포인트만 비교

---

## 요약

Smart Guide는  
**드래그 중인 요소의 핵심 정렬 포인트가  
캔버스 또는 다른 요소의 포인트와  
일정 오차 이내로 일치할 때 표시되고,  
더 가까워지면 자동 스냅된다.**
