너는 이 프로젝트의 리팩토링/기능 구현 엔지니어다. 아래 규칙과 목표를 반드시 지켜라.

[프로젝트/환경]

- React + Vite + Yarn 프로젝트다.
- Supabase를 사용한다.
- /admin 경로에서 로그인 및 대시보드 접근이 가능해야 한다.
- admin@muruai.com 이메일만 Admin 접근 가능하다.

[프로젝트 규칙]

- feature-first 폴더 구조: src/shared, src/features/<feature>/\*
- shared는 feature를 import하면 안 된다.
- Page는 조합만 하고 로직은 hooks/model로 내린다.
- 습관적 useMemo/useCallback은 제거하되, 성능/참조 동일성이 명확한 경우만 남긴다.
- 상태는 서버/로컬/전역으로 분류, 중복 상태 제거(파생값은 계산으로).
- 공통 UI는 shared/ui로 분리하되 store/API/navigation 접근 금지.
- 결과물은 “기능 동일”이 우선이며, 기존 기능/UX는 바꾸지 말 것(단, admin 신규 추가는 허용).

[사전 인지 단계(반드시 먼저 수행)]

1. Vite 엔트리/라우팅 구조를 코드 근거로 요약:
   - src/main.tsx / App.tsx에서 라우팅이 어떻게 구성되는지
   - react-router-dom 사용 여부 및 /admin 라우트 추가 위치
2. Supabase client 초기화 위치를 찾고 요약:
   - createClient가 어디서 호출되는지
   - env 변수(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 등) 사용 방식
3. DB 스키마에서 아래 데이터가 어디에 저장되는지 “실제 테이블/컬럼명”으로 확인하고 요약:
   - 유저 활동(로그인/세션/활동 이벤트)
   - 자료 생성(문서/프로젝트 생성 row)
   - 템플릿 사용(문서에 template_id 컬럼 또는 template_usage 로그)
   - 다운로드 이벤트(log)
     없다면 추측 구현 금지. 필요한 최소 이벤트 테이블/컬럼(DDL)과 삽입 지점만 제안하고,
     Admin UI는 “현재 존재하는 데이터로 계산 가능한 지표”부터 구현하라(빈 상태 포함).

[대시보드 요구 지표(기간 필터 지원, 기본 최근 7일/30일)]

1. 주간활성화:
   - WAU: 7일 내 활동 이벤트 1회 이상 유저 수
   - 유저별 주간 방문 횟수(로그인/세션 이벤트 count) 평균/분포
2. 자료 제작 횟수:
   - Total, Weekly(기간)
3. 템플릿 사용률:
   - 템플릿 기반 생성 수
   - 템플릿 사용자 비율(생성 유저 중 template 사용 유저 비율)
   - Top 템플릿: 템플릿별 사용횟수, 해당 템플릿으로 생성된 자료 수
4. 다운로드:
   - 다운로드 이벤트 수
   - 다운로드 전환율(다운로드된 자료/생성된 자료)
   - 다운로드 유저 비율(다운로드 유저/활동 유저)

[UI/UX(ERP형, 직관적)]

- 상단 KPI 카드 + 기간 필터(최근 7일/30일/커스텀)
- 일자별 트렌드 차트: 생성/다운로드
- 주간 방문 횟수 분포 차트
- Top 템플릿 테이블
- 로딩 스켈레톤/빈 상태/에러 상태 + 재시도 버튼

[보안/접근제어]

- /admin 진입 시 아래 플로우를 구현:
  1. 로그인 상태 아님 -> AdminLoginView 표시
  2. 로그인 상태 + user.email === "admin@muruai.com" -> AdminDashboard 표시
  3. 로그인 상태 + 그 외 이메일 -> UnauthorizedView + 로그아웃 버튼
- 프론트 가드만으로 끝내지 말고, 가능하면 DB 쪽도 제안:
  - admin 전용 집계 View/RPC + RLS로 admin만 select/execute 가능하도록 권장(기존 정책은 깨지 말고 추가).

[아키텍처/폴더 구조(필수)]

- 새 기능은 src/features/admin/ 아래로 만든다:
  - pages/AdminPage.tsx (조합: auth gate + view 선택)
  - hooks/useAdminAuth.ts (세션/이메일 확인)
  - hooks/useAdminDashboard.ts (기간 필터 + 데이터 로딩)
  - api/adminMetrics.ts (supabase query/RPC)
  - ui/AdminLoginView.tsx (로그인 UI: email/password or magic link - 기존 방식 확인 후 동일 적용)
  - ui/AdminDashboardView.tsx (순수 렌더)
  - ui/parts/\* (KpiCards, TrendChart, DistributionChart, TemplatesTable 등)
- shared/ui에는 Card/Table/Stat 같은 “순수 UI”만 올릴 수 있다(절대 supabase/store 접근 금지).

[구현 세부]

- 로그인 방식은 프로젝트의 기존 Supabase auth 흐름을 그대로 따른다(새 방식 임의 도입 금지).
- 지표 쿼리는 가능한 한 서버(RPC/View)로 집계하되, 프로젝트가 아직 준비 안 됐으면 프론트에서 최소 집계 가능.
- 성능: 불필요한 memo/callback 남용 금지.
- 상태: 대시보드 필터(dateRange) 정도만 로컬 state, 지표 데이터는 서버 fetch 결과로 관리.

[산출물 형식]

1. 이동/분리된 파일 구조 트리
2. 핵심 변경 요약(상태/컴포넌트 분리/메모 제거/보안 처리 이유)
3. git diff patch 형태로 변경 코드 제공(파일별 diff)
4. (옵션) 필요한 DB View/RPC/DDL SQL 제안

[대상 파일/폴더]

- src/main.tsx (또는 엔트리)
- src/App.tsx (또는 라우팅 파일)
- supabase client 초기화 파일
- 새로 생성: src/features/admin/\*\*
