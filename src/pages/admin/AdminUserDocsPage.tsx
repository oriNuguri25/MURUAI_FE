import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Search, Shield } from "lucide-react";
import { supabase } from "@/shared/supabase/supabase";
import DesignPaper from "@/features/design/components/DesignPaper";
import type { CanvasDocument } from "@/features/design/model/pageTypes";

type UserMadeRow = {
  id: string;
  user_id: string;
  name: string | null;
  created_at: string | null;
  canvas_data?: unknown | null;
};

type TargetRow = {
  user_made_id: string | null;
  child_id: string | null;
  group_id: string | null;
  students_n?:
    | { id: string; name: string | null }
    | { id: string; name: string | null }[]
    | null;
  groups_n?:
    | { id: string; name: string | null }
    | { id: string; name: string | null }[]
    | null;
};

type DocTarget = {
  type: "child" | "group";
  id: string;
  name: string;
};

type DocItem = UserMadeRow & {
  targets: DocTarget[];
  canvasData: CanvasDocument | null;
};

const formatDate = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ko-KR");
};

const parseCanvasData = (value: unknown): CanvasDocument | null => {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as CanvasDocument;
      return Array.isArray(parsed.pages) ? parsed : null;
    } catch {
      return null;
    }
  }
  if (typeof value === "object") {
    const data = value as CanvasDocument;
    return Array.isArray(data.pages) ? data : null;
  }
  return null;
};

const AdminUserDocsPage = () => {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadDocs = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      const [docsResult, targetsResult] = await Promise.all([
        supabase
          .from("user_made_n")
          .select("id,user_id,name,created_at,canvas_data")
          .order("created_at", { ascending: false }),
        supabase
          .from("user_made_targets_n")
          .select(
            "user_made_id,child_id,group_id,students_n(id,name),groups_n(id,name)"
          ),
      ]);

      if (docsResult.error) {
        setErrorMessage("학습자료 목록을 불러오지 못했어요.");
        setDocs([]);
        setIsLoading(false);
        return;
      }

      const nextDocs = (docsResult.data as UserMadeRow[] | null) ?? [];

      if (targetsResult.error) {
        setErrorMessage("등록 대상을 불러오지 못했어요.");
      }

      if (nextDocs.length === 0) {
        setDocs([]);
        setIsLoading(false);
        return;
      }

      const targetsByDoc = new Map<string, DocTarget[]>();
      const addTarget = (docId: string, target: DocTarget) => {
        const list = targetsByDoc.get(docId) ?? [];
        if (
          !list.some(
            (item) => item.type === target.type && item.id === target.id
          )
        ) {
          list.push(target);
        }
        targetsByDoc.set(docId, list);
      };

      const targetRows = targetsResult.data as TargetRow[] | null;
      targetRows?.forEach((row) => {
        if (!row.user_made_id) return;
        if (row.child_id) {
          const childName =
            row.students_n && !Array.isArray(row.students_n)
              ? row.students_n.name ?? "아동"
              : "아동";
          addTarget(row.user_made_id, {
            type: "child",
            id: row.child_id,
            name: childName,
          });
        }
        if (row.group_id) {
          const groupName =
            row.groups_n && !Array.isArray(row.groups_n)
              ? row.groups_n.name ?? "그룹"
              : "그룹";
          addTarget(row.user_made_id, {
            type: "group",
            id: row.group_id,
            name: groupName,
          });
        }
      });

      setDocs(
        nextDocs.map((doc) => ({
          ...doc,
          targets: targetsByDoc.get(doc.id) ?? [],
          canvasData: parseCanvasData(doc.canvas_data),
        }))
      );
      setIsLoading(false);
    };

    loadDocs();
  }, []);

  const filteredDocs = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return docs;
    return docs.filter((doc) => {
      const nameMatch = (doc.name || "").toLowerCase().includes(keyword);
      const userMatch = doc.user_id.toLowerCase().includes(keyword);
      const targetMatch = doc.targets.some((target) =>
        target.name.toLowerCase().includes(keyword)
      );
      return nameMatch || userMatch || targetMatch;
    });
  }, [docs, searchTerm]);

  const { docsByUser, userEntries } = useMemo(() => {
    const grouped = new Map<string, DocItem[]>();
    filteredDocs.forEach((doc) => {
      const list = grouped.get(doc.user_id) ?? [];
      list.push(doc);
      grouped.set(doc.user_id, list);
    });
    const entries = Array.from(grouped.entries()).map(([userId, items]) => ({
      userId,
      items,
      total: items.length,
      latestCreatedAt: items[0]?.created_at ?? null,
    }));
    entries.sort((a, b) => {
      const aTime = a.latestCreatedAt
        ? new Date(a.latestCreatedAt).getTime()
        : 0;
      const bTime = b.latestCreatedAt
        ? new Date(b.latestCreatedAt).getTime()
        : 0;
      return bTime - aTime;
    });
    return { docsByUser: grouped, userEntries: entries };
  }, [filteredDocs]);

  const activeUserId = useMemo(() => {
    if (userEntries.length === 0) return null;
    if (selectedUserId && docsByUser.has(selectedUserId)) {
      return selectedUserId;
    }
    return userEntries[0]?.userId ?? null;
  }, [docsByUser, selectedUserId, userEntries]);

  const selectedDocs = activeUserId ? docsByUser.get(activeUserId) ?? [] : [];

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex w-full items-center justify-between px-10 pt-8 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-black-60 transition hover:bg-black-10"
            aria-label="뒤로가기"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-title-18-semibold text-black-100">
                관리자 보관함
              </span>
              <span className="text-12-regular text-black-50">
                유저별 학습자료 확인
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black-40" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="유저 ID 또는 자료명 검색"
              className="h-11 w-full rounded-xl border border-black-20 bg-black-5 pl-10 pr-4 text-14-regular text-black-90 placeholder:text-black-50 focus:border-primary focus:outline-none"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-black-10 bg-white-100 px-4 py-2">
          <span className="text-12-regular text-black-60">
            유저 {userEntries.length}명 · 자료 {filteredDocs.length}개
          </span>
        </div>
      </div>

      <div className="flex w-full flex-1 gap-6 overflow-hidden px-10 pb-10">
        <aside className="flex min-h-0 w-72 flex-col gap-3 overflow-hidden rounded-2xl border border-black-10 bg-white-100 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-14-semibold text-black-80">유저 목록</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center rounded-xl border border-black-10 bg-black-5 py-10">
                <span className="text-14-regular text-black-50">
                  유저 목록을 불러오는 중입니다.
                </span>
              </div>
            ) : userEntries.length === 0 ? (
              <div className="flex items-center justify-center rounded-xl border border-black-10 bg-black-5 py-10">
                <span className="text-14-regular text-black-50">
                  표시할 유저가 없습니다.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {userEntries.map((entry) => (
                  <button
                    key={entry.userId}
                    type="button"
                    onClick={() => setSelectedUserId(entry.userId)}
                    className={`flex flex-col gap-2 rounded-xl border px-3 py-3 text-left transition ${
                      activeUserId === entry.userId
                        ? "border-primary bg-primary/5"
                        : "border-black-10 hover:border-black-20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-12-semibold text-black-90 break-all">
                        {entry.userId}
                      </span>
                      <span className="rounded-full bg-black-10 px-2 py-0.5 text-12-regular text-black-60">
                        {entry.total}개
                      </span>
                    </div>
                    <span className="text-12-regular text-black-50">
                      최근 생성: {formatDate(entry.latestCreatedAt)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
                <span className="text-title-16-semibold text-black-100">
                {activeUserId
                  ? `유저 ${activeUserId}`
                  : "유저를 선택해주세요"}
              </span>
              <span className="text-12-regular text-black-50">
                {activeUserId
                  ? `${selectedDocs.length}개 자료`
                  : "좌측 목록에서 유저를 선택하면 자료를 확인할 수 있어요."}
              </span>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-14-regular text-red-600">
              {errorMessage}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center rounded-xl border border-black-10 bg-black-5 py-14">
              <span className="text-14-regular text-black-50">
                학습자료를 불러오는 중입니다.
              </span>
            </div>
          ) : !activeUserId ? (
            <div className="flex items-center justify-center rounded-xl border border-black-10 bg-black-5 py-14">
              <span className="text-14-regular text-black-50">
                유저를 선택해주세요.
              </span>
            </div>
          ) : selectedDocs.length === 0 ? (
            <div className="flex items-center justify-center rounded-xl border border-black-10 bg-black-5 py-14">
              <span className="text-14-regular text-black-50">
                등록된 학습자료가 없습니다.
              </span>
            </div>
          ) : (
            <div className="grid w-full flex-1 grid-cols-2 gap-4 overflow-y-auto md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {selectedDocs.map((doc) => {
                const previewPage = doc.canvasData?.pages?.[0];
                const pageWidthPx = 210 * 3.7795;
                const pageHeightPx = 297 * 3.7795;
                const previewOrientation =
                  previewPage?.orientation ?? "vertical";
                const previewBaseWidth =
                  previewOrientation === "horizontal"
                    ? pageHeightPx
                    : pageWidthPx;
                const previewBaseHeight =
                  previewOrientation === "horizontal"
                    ? pageWidthPx
                    : pageHeightPx;
                const previewScale = 0.18;
                const previewScaledWidth = previewBaseWidth * previewScale;
                const previewScaledHeight = previewBaseHeight * previewScale;
                return (
                  <div
                    key={doc.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/${doc.id}/edit`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/${doc.id}/edit`);
                      }
                    }}
                    className="flex cursor-pointer flex-col gap-3 rounded-2xl border border-black-20 bg-white-100 p-3 text-left shadow-sm transition hover:border-primary hover:shadow-md"
                  >
                    <div className="relative aspect-3/4 w-full overflow-hidden rounded-xl border border-black-10 bg-black-5">
                      {previewPage ? (
                        <div
                          className="absolute left-1/2 top-1/2"
                          style={{
                            width: `${previewScaledWidth}px`,
                            height: `${previewScaledHeight}px`,
                            transform: "translate(-50%, -50%)",
                          }}
                        >
                          <div
                            style={{
                              width: `${previewBaseWidth}px`,
                              height: `${previewBaseHeight}px`,
                              transform: `scale(${previewScale})`,
                              transformOrigin: "top left",
                              pointerEvents: "none",
                            }}
                          >
                            <DesignPaper
                              pageId={`admin-${doc.id}`}
                              orientation={previewOrientation}
                              elements={previewPage.elements}
                              selectedIds={[]}
                              editingTextId={null}
                              readOnly
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-12-regular text-black-40">
                          미리보기 없음
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-14-semibold text-black-90">
                        {doc.name || "제목 없음"}
                      </span>
                      <span className="text-12-regular text-black-50">
                        {formatDate(doc.created_at)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {doc.targets.length === 0 ? (
                        <span className="rounded-full bg-black-10 px-2 py-1 text-12-regular text-black-70">
                          등록 대상 없음
                        </span>
                      ) : (
                        doc.targets.map((target) => (
                          <span
                            key={`${target.type}-${target.id}`}
                            className="rounded-full bg-black-10 px-2 py-1 text-12-regular text-black-70"
                          >
                            {target.type === "child" ? "아동" : "그룹"}:{" "}
                            {target.name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminUserDocsPage;
