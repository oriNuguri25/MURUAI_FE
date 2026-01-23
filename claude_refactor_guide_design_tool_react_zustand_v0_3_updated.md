# Claude 전용 리팩토링 지침 (React + Zustand) — 디자인 툴(피그마/캔바류) 제품 맥락 반영 v0.3

> 이 문서는 **“디자인 툴(예: Figma/Canva)”** 같은 **캔버스 기반 편집기/협업 툴**을 전제로 한다.  
> 목표는 **기능 변경 없이** 코드베이스를 “확장 가능한 구조 + 성능 최적화 + React Compiler 친화”로 정리하는 것이다.  
> 리팩토링은 **점진적으로** 진행하며, 진행 상황/결정을 이 문서(또는 README)에서 **로그로 누적**한다.

---

너는 이 프로젝트의 리팩토링 엔지니어다.

## 0) 제품(디자인 툴) 맥락에서의 최우선 품질 기준

디자인 툴은 일반 CRUD 앱과 달리 아래 특성이 강하다. 리팩토링은 이 특성을 최우선으로 반영한다.

### 0.1 캔버스/렌더링 성능이 UX의 핵심

- 오브젝트 수가 많고(수백~수천), 드래그/리사이즈/줌/팬이 잦다.
- “한 프레임 지연”이 곧 제품 품질 저하로 체감된다.
- 따라서:
  - **캔버스 렌더 루프와 React 렌더를 분리**(React는 UI/패널/툴바 중심, 캔버스는 별도 렌더러/레이어)하는 설계가 필요하다.
  - 상태는 **최소 구독**(selector)과 **변경 범위 최소화**가 필수.

### 0.2 편집 상태(Selection / Hover / Tool / History)는 고빈도 업데이트

- 드래그 중 pointer move는 초당 수십~수백 번 발생한다.
- 따라서:
  - “모든 pointer move를 전역 store에 넣고 전 컴포넌트 리렌더”는 금지.
  - 고빈도 이벤트는 **캔버스 내부 상태(혹은 requestAnimationFrame 기반의 별도 store)**로 처리하고,
  - React UI에는 **필요한 요약 정보만** 흘려보낸다.

### 0.3 협업/동기화(선택 사항)

- 실시간 협업이 있다면 로컬 편집 상태와 서버 동기화 상태는 분리해야 한다.
- “서버 데이터 복제본을 또 store에 보관”하지 말고, **정규화/식별자 기반 참조**로 운영한다.

---

## 1) 폴더 구조 (React 전용, Feature-first)

> 원칙: **feature 경계**를 확실히 하고, 공용은 shared로 끌어올린다.  
> 디자인 툴 특성상 **editor(편집기)** feature를 중심으로 분리한다.

```txt
src/
  app/                      # 엔트리, 라우팅, 전역 Provider(Theme 등)
  shared/                   # 전 기능 공용 (절대 features를 import하지 않음)
    ui/                     # 순수 UI (Button, Input, Modal...) - 비즈니스 로직 금지
    hooks/                  # 범용 훅 (useDebounce 등)
    lib/                    # 유틸 (math/geom/format/validation)
    styles/                 # design tokens, theme, typography
    types/                  # 전역 타입
  features/
    editor/                 # 디자인 툴 핵심 편집기
      canvas/               # 캔버스 렌더러(React 밖에서 굴러도 됨), hit-test, viewport
      model/                # Zustand store + selectors (selection/tool/viewport 등)
      history/              # undo/redo, command pattern (선택)
      ui/                   # 패널/툴바/인스펙터 등 editor UI
      hooks/                # editor 전용 훅 (selection 결합 등)
      pages/                # 라우트 레벨 (EditorPage)
      index.ts
    assets/                 # 에셋/라이브러리(템플릿, 스톡 등) 기능이 있으면 별도 feature
    auth/
    billing/
    ...
```

### 1.1 의존성 규칙 (강제)

- `shared/*` → `features/*` import **금지**
- `features/A` → `features/B` 직접 import **금지**
  - 재사용이 필요하면 `shared` 또는 상위 레이어로 승격
- `pages/`는 조합만 한다. 로직은 `hooks/` 또는 `model/`로 내려라.

---

## 2) SRP(단일 책임) 분리 규칙

### 2.1 Page(라우트 레벨)의 책임

- 라우팅 파라미터 읽기, 레이아웃 조합
- Editor 초기화(필요 시) 정도까지만
- 캔버스 로직/비즈니스 로직은 훅/모델로 위임

### 2.2 View / Parts 구조(권장)

- `EditorPage.tsx`: 라우트/조합
- `EditorView.tsx`: 순수 렌더 (props 기반)
- `parts/`: Toolbar, LayersPanel, InspectorPanel, CanvasStage 등

> **중요:** `CanvasStage`는 React 렌더에 의존하지 않도록 설계하는 것이 이상적이다.  
> (React는 컨테이너/오버레이 UI만 담당)

---

## 3) Zustand 상태 관리 규칙 (디자인 툴 최적화 포함)

### 3.1 상태 분류

- **로컬 UI 상태**: 컴포넌트 내부 (`useState`)
- **Feature 상태**: `features/<feature>/model`의 store
- **전역 상태**: 인증/테마 등 진짜 전역만

### 3.2 중복 상태 금지

- 서버 데이터(문서, 노드 트리)를 store에 그대로 복제하지 않는다.
- derived 값(선택 개수, bounding box 등)은 “저장”이 아니라 “계산(selector)”로 만든다.

### 3.3 구독 최소화(리렌더 최적화)

- store 전체 구독 금지:
  ```ts
  // ❌ 금지
  const s = useEditorStore();
  ```
- selector로 필요한 조각만:
  ```ts
  // ✅ 권장
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  ```

### 3.4 고빈도 이벤트 처리 원칙(디자인 툴 전용)

- pointer move/drag/zoom처럼 고빈도 이벤트는:
  1. 캔버스 내부 상태(렌더러/viewport)에서 처리하고
  2. React/Zustand에는 **최종 결과 또는 스로틀된 요약 정보**만 반영

> “모든 move를 store에 반영”은 성능 악화의 지름길이다.

---

## 4) React Compiler 친화 규칙 (useMemo/useCallback 남용 제거)

### 4.1 기본 원칙

- 습관적 `useMemo/useCallback`은 제거한다.
- 병목이 명확하거나 참조 동일성이 의미 있을 때만 사용한다.

### 4.2 디자인 툴에서 자주 생기는 오해

- “캔버스가 느리니 memo를 더 붙여야 한다” → 대개 **근본 해결이 아님**
- 근본 해결은:
  - React 렌더 범위를 줄이고(구독 최소화)
  - 캔버스 렌더 루프를 React와 분리
  - 이벤트를 store로 과도하게 흘리지 않기

---

## 5) 공통 컴포넌트(shared/ui) 분리 규칙

### 5.1 shared/ui로 올릴 조건(2개 이상)

- 서로 다른 feature에서 2회 이상 사용
- 비즈니스 규칙 없음(UI 규칙만)
- 도메인 종속 없음(User/Document/Node 등에 묶이지 않음)

### 5.2 금지 사항

- shared/ui 내부에서 store 접근, API 호출, navigation 금지
- 필요 시 feature/ui에서 “Wrapper”를 만들어 결합한다.

---

## 6) Editor(디자인 툴) 권장 아키텍처 메모

> 프로젝트 상황에 따라 다르지만, 리팩토링의 방향성을 잡기 위한 권장 패턴이다.

### 6.1 CanvasStage 분리

- `CanvasStage`는 다음을 담당:
  - viewport(zoom/pan), hit-test, selection box 렌더
  - node 렌더링(2D canvas/WebGL/SVG 등)
  - pointer 이벤트 처리(드래그/리사이즈)
- React UI는:
  - 툴바/패널/인스펙터/오버레이(핸들, 가이드) 정도만 담당

### 6.2 Command/History(Undo/Redo)

- 변경은 “명령(Command)”로 추상화하면 안정적
- 상태 변경을 한곳(model/actions)으로 모으면 디버깅/협업 동기화에도 유리

---

## 7) 코드 템플릿 (주석 포함)

### 7.1 Editor Store 템플릿 (Zustand)

`src/features/editor/model/store.ts`

```ts
import { create } from "zustand";

/**
 * Editor store는 "편집기 클라이언트 상태"를 담당한다.
 * - 고빈도 pointer move 값을 매번 store에 넣지 않는다.
 * - 문서 전체 트리를 복제 저장하지 않는다(식별자/참조 기반 권장).
 */

type Tool = "select" | "hand" | "shape" | "text";

type EditorState = {
  /** 현재 선택된 툴 (툴바 UI와 연동) */
  tool: Tool;
  setTool: (tool: Tool) => void;

  /** 현재 선택된 오브젝트 id들 (selection) */
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;

  /** 인스펙터에 표시할 현재 선택 요약(derived는 selector로 만들기 권장) */
  // summary: ... (저장보단 selector)
};

export const useEditorStore = create<EditorState>((set) => ({
  tool: "select",
  setTool: (tool) => set({ tool }),

  selectedIds: [],
  setSelectedIds: (ids) => set({ selectedIds: ids }),
}));
```

### 7.2 Selector 훅 템플릿(구독 최소화)

`src/features/editor/model/selectors.ts`

```ts
import { useEditorStore } from "./store";

/**
 * selector 훅은 컴포넌트의 구독 범위를 최소화하기 위한 공식 진입점.
 * 컴포넌트는 store 전체를 꺼내지 말고 selector 훅을 사용한다.
 */

export const useTool = () => useEditorStore((s) => s.tool);
export const useSetTool = () => useEditorStore((s) => s.setTool);

export const useSelectedIds = () => useEditorStore((s) => s.selectedIds);
export const useSetSelectedIds = () => useEditorStore((s) => s.setSelectedIds);

/** ✅ derived 값은 저장하지 말고 계산으로 */
export const useHasSelection = () =>
  useEditorStore((s) => s.selectedIds.length > 0);
```

### 7.3 Page / Hook / View 분리 템플릿

`src/features/editor/pages/EditorPage.tsx`

```tsx
import { EditorView } from "../ui/EditorView";
import { useEditorVM } from "../hooks/useEditorVM";

/**
 * EditorPage (라우트 레벨)
 * - 라우트 파라미터 처리
 * - EditorView에 VM을 내려주는 조합 역할
 */
export function EditorPage() {
  const vm = useEditorVM();
  return <EditorView {...vm} />;
}
```

`src/features/editor/hooks/useEditorVM.ts`

```ts
import { useTool, useSetTool, useHasSelection } from "../model/selectors";

/**
 * useEditorVM
 * - editor 화면의 상태 결합 + 파생값 계산 + 핸들러 제공
 * - 렌더링 코드는 넣지 않는다.
 * - 불필요한 useCallback 남용 금지(React Compiler가 처리할 수 있게)
 */
export function useEditorVM() {
  const tool = useTool();
  const setTool = useSetTool();
  const hasSelection = useHasSelection();

  const onSelectTool = (nextTool: typeof tool) => setTool(nextTool);

  return {
    tool,
    hasSelection,
    onSelectTool,
  };
}
```

`src/features/editor/ui/EditorView.tsx`

```tsx
import { Toolbar } from "./parts/Toolbar";
import { CanvasStage } from "./parts/CanvasStage";

/**
 * EditorView (순수 렌더)
 * - store/API 접근 금지
 * - props 기반 렌더링
 */
type Props = {
  tool: "select" | "hand" | "shape" | "text";
  hasSelection: boolean;
  onSelectTool: (tool: Props["tool"]) => void;
};

export function EditorView({ tool, hasSelection, onSelectTool }: Props) {
  return (
    <div className="editor-root">
      <Toolbar tool={tool} onSelectTool={onSelectTool} />
      <CanvasStage />
      {/* hasSelection은 인스펙터/패널 노출 여부 등에 사용 가능 */}
      {hasSelection ? <div className="status">Selection Active</div> : null}
    </div>
  );
}
```

---

## 8) 점진적 변경(Incremental Refactor) 운영 방식

### 8.1 Phase 정의

- Phase 1: 폴더 구조 확립 + 파일 이동(동작 동일)
- Phase 2: Zustand 상태 재배치(중복 제거 + selector 도입)
- Phase 3: SRP 분리(Page/Hook/View/Parts)
- Phase 4: shared/ui 공통화
- Phase 5: React Compiler 친화 정리(useMemo/useCallback 정리)
- Phase 6: Editor 특화(캔버스 루프 분리/고빈도 이벤트 최적화) — 필요 시

### 8.2 매 작업 후 반드시 업데이트

- Refactor Log
- Decision Log(중요한 규칙/결정 변경 시)

---

## 9) Refactor Log (매 작업 후 업데이트)

> 아래 섹션은 **대화를 이어가기 위한 핵심 기록**이다.  
> 작업이 끝날 때마다 날짜를 추가하고, 변경 내용을 기록한다.

### 2026-01-22

- 작업 범위:
  - 디자인 사이드바 메뉴 구성 정리 및 AI 이미지 생성 패널 분리
  - 요소/텍스트/감정/AAC 상세 패널 구조 정리
  - 업로드/글꼴 패널 view 분리 및 데이터 바인딩 정리
  - 템플릿 패널의 preview/모달 렌더링 구조 정리
  - 히스토리 store 구독 범위 축소
  - MainSection 히스토리 동기화 로직 분리
  - MainSection 이미지 채우기 구독 로직 분리
  - MainSection store 구독(템플릿/폰트/요소/방향/보드) 로직 분리
  - MainSection 선택/툴바 계산 로직 분리
  - MainSection 페이지 조작 핸들러 분리
  - MainSection 페이지/요소 생성 유틸 분리
  - MainSection 자동 저장/캔버스 이벤트 로직 분리
  - MainSection 템플릿 선택 모달 컴포넌트 분리
  - MainSection 상단 툴바 렌더 분리
  - MainSection 캔버스 스테이지 렌더 분리
  - MainSection PDF 미리보기 렌더 분리
  - MainSection 다중 선택 툴바 핸들러 분리
  - MainSection 페이지 복제 로직 유틸 분리
  - MainSection 템플릿 적용 핸들러 분리
  - MainSection 활성 페이지 전환 로직 분리
  - MainSection 캔버스 스테이지 핸들러 분리
  - MainSection 방향 정규화 유틸 분리
  - MainSection 선택 해제 핸들러 분리
  - MainSection 템플릿 알림 로직 분리
  - MainSection 활성 페이지 상태 계산 분리
  - MainSection 초기 페이지 상태 분리
  - useHistorySync 내부 책임 분리
  - MainSection ref 동기화 로직 분리
  - MainSection 텍스트 편집 트랜잭션 분리
  - ref 타입을 읽기 전용으로 정리
  - MainSection PDF 방향 정규화 책임 이동
- 변경 요약:
  - SideBar의 메뉴 메타/콘텐츠 매핑을 상수화해 제목/렌더 분기 단순화
  - DesignContent를 container/view로 분리하여 훅 로직과 UI 렌더 경계 강화
  - ElementContent/TextContent를 props 기반 뷰로 분리하고 상수 프리셋 적용
  - EmotionContent/AACContent 필터링 로직을 단순화하고 불필요한 memo 제거
  - UploadContent/FontContent를 view로 분리해 store/IO 로직과 렌더 경계를 분리
  - TemplateContent를 view/logic로 분리하고 미리보기 계산을 헬퍼로 통일
  - TemplateContent props를 AAC/Story 도메인 단위 객체로 묶어 전달
  - MainSection에서 history store 전체 구독을 제거하고 selector 기반으로 분리
  - useHistorySync 훅으로 히스토리 초기화/기록/undo 처리 책임을 분리
  - useImageFillSubscription 훅으로 이미지 채우기 로직을 분리
  - useTemplateSubscription/useFontSubscription/useElementSubscription/useOrientationSubscription/useBoardSubscriptions 추가
  - useSelectionState 훅으로 다중 선택/툴바 계산을 분리
  - usePageActions 훅으로 페이지 추가/복제/삭제 핸들러를 분리
  - pageFactory 유틸로 초기 페이지/템플릿/요소 생성 로직을 이동
  - useAutoSave/useCanvasGetter/useCanvasWheelZoom 훅으로 부수효과 분리
  - TemplateChoiceDialog 컴포넌트로 템플릿 적용 모달 렌더링 분리
  - normalizeOrientation 유효성 체크를 인라인으로 복구
  - cloneElementsWithNewIds 반환 구조 오류 수정
  - MultiSelectionToolbar/ElementToolbars로 선택/도형/선 툴바 렌더 분리
  - 다중 선택 테두리 패널 UI 상태를 전용 컴포넌트로 이동
  - CanvasStage 컴포넌트로 캔버스/DesignPaper 렌더 블록 분리
  - PdfPreviewContainer 컴포넌트로 PDF 숨김 렌더링 분리
  - useSelectionToolbarActions 훅으로 다중 선택 색/폰트 패널 핸들러 분리
  - cloneElementsWithNewIds 유틸을 usePageActions 내부로 이동
  - useTemplateApplyActions 훅으로 템플릿 적용 핸들러 분리
  - useActivePageManager 훅으로 활성 페이지 전환/방향 동기화 분리
  - useCanvasStageHandlers 훅으로 캔버스 상호작용/요소 변경 핸들러 분리
  - normalizeOrientationValue 유틸을 공통 함수로 분리해 재사용
  - useSelectionClearer 훅으로 선택 해제 로직 분리
  - PdfPreviewContainer에서 방향 정규화를 처리하도록 이동
  - useTemplateNotifications 훅으로 템플릿 적용 토스트 로직 분리
  - useActivePageState 훅으로 활성 페이지/방향 계산 분리
  - useInitialPageState 훅으로 초기 페이지/선택 상태 구성 분리
  - useHistorySync 내부 이펙트를 역할별 훅으로 분리
  - useSyncedRef 훅으로 ref 동기화 useEffect 제거
  - useTextEditTransaction 훅으로 텍스트 편집 트랜잭션 분리
  - ReadonlyRef 타입을 도입해 읽기 전용 ref 파라미터를 명확히 구분
- 이동/추가된 파일:
  - src/features/design/hooks/useHistorySync.ts
  - src/features/design/hooks/useImageFillSubscription.ts
  - src/features/design/utils/imageFillUtils.ts
  - src/features/design/hooks/useTemplateSubscription.ts
  - src/features/design/hooks/useFontSubscription.ts
  - src/features/design/hooks/useElementSubscription.ts
  - src/features/design/hooks/useOrientationSubscription.ts
  - src/features/design/hooks/useBoardSubscriptions.ts
  - src/features/design/hooks/useSelectionState.ts
  - src/features/design/hooks/usePageActions.ts
  - src/features/design/utils/pageFactory.ts
  - src/features/design/hooks/useAutoSave.ts
  - src/features/design/hooks/useCanvasGetter.ts
  - src/features/design/hooks/useCanvasWheelZoom.ts
  - src/features/design/components/TemplateChoiceDialog.tsx
  - src/features/design/components/MultiSelectionToolbar.tsx
  - src/features/design/components/ElementToolbars.tsx
  - src/features/design/components/CanvasStage.tsx
  - src/features/design/components/PdfPreviewContainer.tsx
  - src/features/design/hooks/useSelectionToolbarActions.ts
  - src/features/design/utils/elementClone.ts
  - src/features/design/hooks/useTemplateApplyActions.ts
  - src/features/design/hooks/useActivePageManager.ts
  - src/features/design/hooks/useCanvasStageHandlers.ts
  - src/features/design/utils/orientationUtils.ts
  - src/features/design/hooks/useSelectionClearer.ts
  - src/features/design/hooks/useTemplateNotifications.ts
  - src/features/design/hooks/useActivePageState.ts
  - src/features/design/hooks/useInitialPageState.ts
  - src/features/design/hooks/useSyncedRef.ts
  - src/features/design/hooks/useTextEditTransaction.ts
  - src/features/design/types/refTypes.ts
- 제거된 패턴:
  - switch 기반 콘텐츠 분기 및 메뉴 타이틀 계산 함수
  - 목록 필터링을 위한 useMemo 남용
- 리스크/메모:
  - 메뉴 라벨/콘텐츠 맵에 새 항목 추가 시 `MENU_ITEMS`와 동기화 필요

---

## 10) Decision Log (중요 결정 기록)

- 상태관리는 **Zustand**로 통일한다.
- store 구독은 **selector 기반**으로 최소화한다.
- shared/ui는 **비즈니스 로직/라우팅/store 접근 금지**.
- React Compiler를 위해 습관적 memo/callback은 제거한다.
- 디자인 툴 특성상 **고빈도 이벤트는 React 렌더와 분리**하는 방향을 우선한다.

---

## 11) Claude 작업 프롬프트 템플릿

> 파일/화면 단위로 아래 프롬프트를 사용해 일관된 리팩토링 결과를 얻는다.

```txt
너는 이 프로젝트의 리팩토링 엔지니어다. 다음 규칙을 반드시 지켜라:

- feature-first 폴더 구조: src/shared, src/features/editor 를 기준으로 정리한다.
- shared는 feature를 import하면 안 된다.
- Page는 조합만 하고, 로직은 hooks/model로 내려라.
- Zustand는 selector 기반으로 구독 범위를 최소화하라(통째 구독 금지).
- 서버 데이터 복제/중복 상태를 만들지 말고, derived는 계산(selector)으로 처리하라.
- 디자인 툴 특성상 고빈도 이벤트(pointer move/drag/zoom)는 React 렌더와 분리하거나 최소 반영하라.
- React Compiler 친화적으로: 습관적 useMemo/useCallback은 제거하되, 명확한 성능 근거가 있는 경우만 남겨라.
- 공통 UI는 shared/ui로 분리하되, store/API/navigation 접근은 금지한다.
- 기능 동일(동작/UX 변경 없음)이 최우선이다.

[대상 파일/폴더]
- (여기에 파일 경로들)

[요구 결과]
1) 이동/분리된 파일 구조 트리
2) 핵심 변경 요약(상태/컴포넌트 분리/메모 제거 이유)
3) 변경된 코드(전체) 또는 patch 형태
4) Refactor Log에 추가할 기록 초안
```

---

## 12) 체크리스트 (리팩토링 PR 기준)

- [ ] Page가 로직(API/store)을 직접 들고 있지 않다.
- [ ] Zustand 구독이 selector 기반으로 최소화되어 있다.
- [ ] 고빈도 이벤트를 store에 과도하게 반영하지 않는다.
- [ ] shared/ui는 비즈니스/라우팅/store 접근이 없다.
- [ ] derived 값은 state로 저장하지 않고 계산으로 만든다.
- [ ] 불필요한 useMemo/useCallback이 없다.
- [ ] feature 간 직접 import가 없다.
- [ ] 기능이 동일하게 동작한다.

---

끝.
