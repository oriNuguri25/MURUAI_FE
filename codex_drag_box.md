너는 이 프로젝트의 리팩토링/기능 구현 엔지니어다. 아래 규칙과 목표를 반드시 지켜라.

[프로젝트 공통 규칙]

- feature-first 폴더 구조를 강제한다: src/shared, src/features/<feature>/\*를 사용한다.
- shared는 feature를 import하면 안 된다.
- Screen/Page는 조합만 하고, 로직은 hooks/model로 내려라.
- 습관적 useMemo/useCallback은 제거하되, 성능/참조 동일성이 명확한 경우만 남겨라.
- 상태는 서버/로컬/전역으로 분류하고, 중복 상태를 제거하라(파생값은 계산으로).
- 공통 UI는 shared/ui로 분리하되, 비즈니스/네비게이션/store 접근은 금지한다.
- 결과물은 “기능 동일”이 우선이다(기존 UX는 유지하고, 아래 기능만 확장).

[이번 작업 목표 - 캔버스 외부 드래그 선택 지원]
현 구조:

- CanvasStage(containerRef)
  - inline-flex wrapper
    - relative wrapper
      - canvas(배경)
      - absolute(A4크기, scale 적용)
        - DesignPaper(pageWidth x pageHeight)
          - elements
          - SelectionRectOverlay 등

현재 드래그 선택은 DesignPaper에서만 시작 가능하며,
useDesignPaperSelection.ts에서 event.currentTarget !== event.target 조건으로
"DesignPaper 배경 직접 클릭"일 때만 selection을 시작한다.
또 A4 wrapper가 paperWidth/paperHeight로 제한되어 회색 영역(캔버스 바깥)에서 pointerdown이 잡히지 않는다.

원하는 동작:

- 캔버스(회색 영역 포함) 어디서든 드래그 시작 가능
- 드래그가 캔버스 바깥으로 나가도 selection은 계속 진행 (pointer capture)
- 최종 selection rect가 A4 밖에 있어도, 그 rect와 교차하는 A4 내부 요소는 선택되어야 함
- 클릭으로 요소를 선택하는 기존 동작이 있다면, 그것은 유지 (드래그 임계치 기준으로 클릭/드래그 구분)

[핵심 설계 요구사항]

1. 이벤트 수집 영역을 DesignPaper가 아니라 "CanvasStage 전체"로 올려라.
   - PointerDown/Move/Up를 CanvasStage(또는 그 위에 깔린 transparent overlay)에서 받는다.
   - drag 중에는 setPointerCapture(pointerId)를 사용해 영역 밖으로 나가도 추적한다.

2. 좌표계 정리:
   - selection rect와 요소 bbox 교차 검사는 동일 좌표계에서 해야 한다.
   - 목표는 "DesignPaper 좌표계(=paper/world)"에서 rect를 계산한 뒤 요소 bbox와 비교하는 것.
   - 즉, pointer(clientX/Y) -> container rect 기준 -> (scale, padding, pan 등 보정) -> paper/world 좌표로 변환한다.
   - 기존 getPointerPosition은 containerRef rect와 scale만 쓰는데, 이제 padding offset과(필요시) pan offset까지 포함해야 한다.

3. 드래그 시작 조건 변경:
   - event.currentTarget !== event.target 같은 단순 조건은 제거/대체한다.
   - 대신 "요소 위에서 시작한 경우"에는 기존대로 요소 클릭/드래그(이동 등)로 갈 수 있게 구분한다.
   - 추천: event.target.closest('[data-element-id]') 같은 방식으로 요소 클릭 여부 판단.
   - 다만 사용자의 요구는 "회색 영역에서도 selection 시작"이므로, 빈 공간이면 항상 selection 모드 진입.

4. 성능:
   - pointer move를 zustand에 매 프레임 넣지 말고, selection rect는 로컬 상태로 유지한다.
   - 필요하면 requestAnimationFrame으로 move 업데이트를 스로틀해 렌더 폭주를 막는다.
   - 최종 선택 결과(selectedIds)만 zustand에 반영한다.

5. UI:
   - SelectionRectOverlay는 기존처럼 DesignPaper 위에 그릴 수 있다.
   - 하지만 selection rect가 paper 영역 밖에서 시작/끝나도, overlay는 "paper 좌표계 기준으로 클리핑되거나(현재 방식) 또는 paper 밖 시작점을 paper 영역으로 clamp해서 표시" 중 하나를 선택하라.
   - 중요한 것은 “선택 판정”이 정확해야 하며, 표시 방식은 기존 UX를 최대한 유지한다.

[구현 단계(반드시 이 순서로)]
A. 먼저 코드에서 다음을 찾아 요약하라(10줄 내):

- getContainerScale 구현/사용 위치
- padding 정의/의미
- pan/translate 존재 여부
- 요소 bbox 좌표계
- 현재 selection state 저장 위치(local vs zustand)
  이 요약은 출력의 첫 섹션으로 포함하라.

B. 그 다음, 아래 변경을 수행하라:

1.  CanvasStage 레벨에 DragSelectionController(훅 또는 컴포넌트)를 만들고,
    pointer 이벤트를 Stage에서 받도록 연결하라.
2.  좌표 변환 함수 2개를 만든다:
    - clientToContainer(event): client -> container(px)
    - containerToPaper(pos): container(px) -> paper/world (scale, padding, pan 적용)
      최종적으로 selectionRect는 paper/world 좌표계로 유지한다.
3.  drag 임계치(threshold, 예: 3~5px)로 클릭과 드래그를 구분한다.
    - threshold 이하이면 클릭으로 처리(기존 선택 로직 유지)
    - threshold 초과이면 드래그 선택 모드로 전환
4.  rect 교차 검사는 paper/world 좌표계에서 수행한다.
    - 요소 bbox를 같은 좌표로 변환/정규화한다.
5.  pointer capture를 사용해 드래그가 stage 밖으로 나가도 계속 업데이트한다.
6.  기존 useDesignPaperSelection.ts는 역할을 재정의한다.
    - DesignPaper에 묶인 로직이라면 editor/hooks로 옮기고, Stage에서 호출되도록 바꿔라.

[산출물 형식 (반드시 지킬 것)]

1. 이동/분리된 파일 구조 트리
2. 핵심 변경 요약
   - 상태/컴포넌트 분리 이유
   - memo/callback 제거/유지 이유
3. git diff patch 형태로 변경 코드 제공
   - 파일별 diff로 제시
   - 존재하지 않는 파일은 "new file"로 명시

[대상 파일/폴더]

- src/features/editor/ui/parts/CanvasStage.tsx
- src/features/editor/ui/DesignPaper.tsx
- src/features/editor/hooks/useDesignPaperSelection.ts (또는 실제 경로)
- selection overlay 관련 파일들(SelectionRectOverlay 등)
- 요소 bbox/selection store가 있는 model/selectors 파일들
