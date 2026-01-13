# Undo/Redo 꼬임(템플릿 추가 Undo 실패) 진단 & 결정 — Codex 전용 지침 v1

목표: Codex가 **현재 코드의 Undo/Redo 구조를 실제로 진단**하고,  
“템플릿 추가 후 Undo가 템플릿 추가 이전 상태로 정확히 돌아가지 않는 문제”를 해결하기 위한 **최선의 선택(구조/아키텍처)을 내려서 PR 수준의 변경을 제안/적용**하도록 한다.

> 핵심 결론 가이드(사전):  
> - Zustand store를 여러 개로 쪼개는 것은 “Undo 꼬임”의 1차 해결책이 아니다.  
> - 해결의 본질은 **Undo 원자성(atomicity) 확보**: 템플릿 적용을 “한 번의 트랜잭션/커맨드”로 묶어 1-step undo로 만드는 것.

---

## 0) 작업 범위(중요)
- 프로젝트는 웹 디자인 툴(Canva/MiriCanvas 유사)이며 `pages[].elements[]`를 중심으로 편집 상태를 관리한다.
- 사용자 상호작용: 드래그 이동/리사이즈/텍스트(contentEditable) 편집/복붙/그룹화/페이지 추가/템플릿 추가 등.
- 현상: Undo 상태가 다양한 단위로 엮여 “템플릿 추가 Undo”가 정확히 이전 상태로 복귀하지 못함.
- 요구: Codex가 코드베이스를 읽고(검색/탐색), 문제를 재현 가능한 구조 원인으로 정리한 후, 해결 방안을 선택 및 적용한다.

---

## 1) Codex가 먼저 해야 할 코드 진단 절차

### 1.1 Undo/Redo 관련 코드 위치 찾기(필수)
다음 키워드로 검색하여 관련 파일/함수 위치를 리스트업:
- `undo`, `redo`, `history`, `stack`
- `pushHistory`, `commit`, `beginTransaction`, `transaction`
- `setPages`, `pages`, `elements`
- `applyTemplate`, `template`, `insertTemplate`, `addTemplate`
- `selectedIds`, `activeTool`, `selectedPageId`
- `keydown`에서 `Ctrl/Cmd+Z`, `Shift+Ctrl/Cmd+Z` 처리

산출물:
- Undo/Redo 스택을 실제로 관리하는 파일/훅/스토어의 경로와 핵심 함수들
- 템플릿 적용(추가) 로직의 진입점과 내부 단계들(페이지 생성/요소 생성/선택 변경 등)

---

### 1.2 “Undo 단위(커밋 시점)”를 분류하라(필수)
각 인터랙션별로 **history가 언제 push 되는지**를 표로 정리:
- 이동(move): pointermove마다? pointerup에서만?
- 리사이즈(resize): 매 프레임? 종료 시점?
- 텍스트 편집: onInput마다? blur에서만?
- paste: 이벤트 1회? 내부에서 여러 번 push?
- 페이지 추가/삭제: 1회 push? 여러 번 push?
- 템플릿 추가: 1회 push? 여러 state 변경마다 push?

산출물:
- “조각 history push”가 발생하는 지점(템플릿 추가 중 pages/elements/selection이 따로 push되는지) 표시
- “redoStack 초기화”가 올바른 시점에 발생하는지 표시

---

### 1.3 Undo 대상 상태 범위를 분리하라(필수)
현재 상태를 두 범주로 분리하고, Undo가 무엇을 되돌리는지 확인:
- Document state (Undo 대상): pages, elements, templateState, groupId, assets refs 등
- UI state (Undo 비대상 권장): hover, panel open, transient preview, drag handles 등

산출물:
- 현재 Undo 스택이 UI state까지 포함하는지 여부
- 선택 상태(selectedIds/selectedPageId)를 Undo에 포함하는지 여부(선택사항)

---

## 2) Codex가 찾아야 하는 “대표적인 원인 패턴”

### 패턴 A) 템플릿 적용 중 history push가 여러 번 발생
예: 템플릿 적용 함수 안에서
- 페이지 생성 push 1회
- 요소 삽입 push 1회
- 선택 변경 push 1회
→ Undo를 1번 누르면 “중간 상태”로 돌아가며 꼬임 발생

### 패턴 B) pointermove/onInput 같은 고빈도 이벤트에서 history push
- move/resize/text 입력이 프레임/키입력 단위로 쌓이면
템플릿 적용 undo와 섞여 UX가 깨지고 성능도 악화

### 패턴 C) 여러 store에 분산된 history / 혹은 store별로 독립 undo
- pages store undo, selection store undo가 따로 존재 → 순서 불일치

### 패턴 D) 템플릿 적용 중 자동 normalize/auto-save가 history를 오염
- commit 전후로 자동 정리 로직이 push를 발생시키면 이전 상태 복원이 불가능

Codex는 위 패턴 중 무엇이 실제 코드에서 발생하는지 근거(코드 위치)와 함께 기술해야 한다.

---

## 3) 해결책 선택 가이드(확장성 고려)

Codex는 아래 선택 기준에 따라 “최선의 구조”를 결정한다.

### 3.1 1차(즉시 해결) 선택: 단일 History Coordinator + Transaction(권장)
조건:
- 현 Undo가 여러 상태 조각/이벤트 단위로 push되는 구조
- 템플릿 적용이 여러 setState로 구성되어 있음

해결:
- 템플릿 적용을 `history.begin("apply-template")` ~ `history.commit()`로 감싸고
- begin~commit 사이에는 history push가 발생하지 않도록 차단
- commit 시 1개의 entry만 생성하여 Undo 1번에 이전 상태 복귀

장점:
- 구현 빠름
- 기존 구조에 최소 침습
- 템플릿/페이지/그룹/정렬 등 모든 액션에 확장 가능

---

### 3.2 2차(확장성 최고) 선택: Command Pattern(do/undo)
조건:
- 액션 종류가 빠르게 늘고(템플릿/페이지/그룹/정렬/스타일 일괄) 안정성이 중요
- redo, 멱등성, 테스트 용이성이 필요

해결:
- Template 적용을 `ApplyTemplateCommand`로 구현
- do(): template 적용(여러 state 변경 포함)
- undo(): 적용 전 snapshot 또는 역 patch로 복구

장점:
- 복잡한 동작도 안정적으로 undo/redo 가능
- 테스트/추적/로그에 유리

---

### 3.3 Zustand store 분리 여부 판단(결론 규칙)
- store 분리는 “성능/조직화” 목적이면 가능
- **Undo 문제 해결을 위해 store를 늘리지는 않는다.**
- Undo/Redo는 반드시 단일 coordinator가 관리해야 한다(여러 store라도).

Codex는 “store를 분리할지”를 아래 기준으로만 결정한다:
- Document state와 UI state 분리가 현재 코드에서 과도하게 섞여 있는가?
- UI state 변경이 Document 렌더 비용을 크게 유발하는가?

하지만 “템플릿 undo 꼬임” 자체 해결은 transaction/command로 한다.

---

## 4) 필수 구현 지침(코드 수정 시 원칙)

### 4.1 Undo 단위를 “의미 단위”로 정렬하라
- move: pointerup에서 1회 commit
- resize: pointerup에서 1회 commit
- text: 편집 시작~종료(blur) 1회 commit
- paste: 1회 commit
- template apply: 1회 commit
- page add/delete: 1회 commit
- group/ungroup: 1회 commit

### 4.2 Transaction 중에는 “history push 금지”
- begin~commit 동안 발생하는 setPages/setSelectedIds 등의 변경은 모두 “트랜잭션 내부 변경”이며
- commit 시점에만 snapshot/patch를 기록한다.

### 4.3 redoStack 초기화 규칙
- 새로운 commit이 발생하면 redoStack은 반드시 비운다.

---

## 5) Codex 산출물 요구사항(반드시 작성)
Codex는 최종 결과로 아래를 제공해야 한다.

1) **진단 리포트**
- 현재 Undo 구조 설명(무엇을 저장/언제 push)
- 템플릿 적용 로직 흐름과 state 변경 목록
- “왜 템플릿 Undo가 깨지는지”를 특정 코드 위치로 근거 제시

2) **결정**
- (A) Transaction 기반으로 해결 / (B) Command 기반으로 해결 중 하나를 선택
- 선택 이유(확장성, 구현 난이도, 테스트 용이성)

3) **구현 계획**
- 어떤 파일에 어떤 API를 추가/변경하는지 단계별로
- “템플릿 적용”을 1-step undo로 만드는 구체 변경

4) **회귀 테스트 시나리오**
- 템플릿 추가 → Undo 1회 → 템플릿 추가 전과 동일(페이지 수/요소 수/선택/템플릿 상태)
- 템플릿 추가 직후 이동/텍스트 편집 → Undo 연속 수행 시 의미 단위로 되돌아감
- redo 정상 동작
- 텍스트 편집 중 undo/redo 충돌(IME 포함) 방지

---

## 6) 구현 힌트(스냅샷 방식 기본)
초기 해결은 스냅샷 방식으로 진행한다.

### 최소 히스토리 엔트리
```ts
type HistoryEntry = {
  doc: {
    pages: Page[];
    // 필요 시: assets, templateState 등
  };
  ui?: {
    selectedIds?: string[];
    selectedPageId?: string;
  };
  label: string;
  meta?: any;
};
```

- 템플릿 적용은 commit 시점에만 `doc/pages`를 깊은 복사로 저장
- Undo 시 해당 doc를 그대로 적용

---

## 7) “템플릿 적용 Undo”를 1-step으로 만드는 표준 형태
Codex는 템플릿 적용 진입점에서 아래 형태를 구현해야 한다.

```ts
history.begin("apply-template", { templateId, pageId });

applyTemplateToDocState(); // pages/elements/templateState/selection 등 변경

history.commit();
```

그리고 begin~commit 내부에서 history push가 절대 발생하지 않도록 해야 한다.

---

## 8) 완료 기준(DoD)
- 템플릿 추가 후 Undo 1회로 “템플릿 추가 이전” 상태로 정확히 복귀한다.
- Undo/Redo가 의미 단위로 동작한다(move/resize/text/paste/template/page/group).
- redoStack은 새 작업 발생 시 초기화된다.
- 코드는 확장 가능(Transaction → Command 승격이 가능)한 형태로 정리된다.
