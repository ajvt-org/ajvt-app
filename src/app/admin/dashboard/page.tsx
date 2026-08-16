"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BarChart from "@/components/admin/BarChart";
import { formatDateTime, formatDate, formatTime, loginPathWithNext, toThumbUrl } from "@/lib/utils";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { REJECTION_REASONS } from "@/lib/rejectionReasons";
import { allSelected, toggleAll } from "@/lib/selection";
import Link from "next/link";
import ArrowLabel from "@/components/ArrowLabel";
import {
  NO_FILTERS,
  readFilters,
  writeFilters,
  activeFilterCount,
  matchesFilters,
} from "@/lib/memberFilters";
import ProofReuseWarning from "@/components/admin/ProofReuseWarning";
import SamePersonWarning from "@/components/admin/SamePersonWarning";
import type { FilterTab, Member, AgeGroup, OrphanAge } from "./types";
import { STATUS_LABEL, STATUS_BADGE, PAGE_SIZE } from "./constants";
import { toCsv, downloadCsv } from "@/lib/csv";
import AgeGroupsDialog from "./AgeGroupsDialog";
import ManualAddDialog from "./ManualAddDialog";
import { initialFilterTab } from "./initialTab";
import { api, ApiError, errorMessage } from "@/lib/api";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { hoursLabel } from "@/lib/arabicPlural";

function AdminDashboardInner() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  // The address is the state: a narrowed list survives a reload and can be
  // sent to someone else. `filter` is kept as a name because the tabs and the
  // default-tab logic already speak it.
  const searchParams = useSearchParams();
  const urlFilters = readFilters(new URLSearchParams(searchParams.toString()));
  const [filters, setFiltersState] = useState(urlFilters);
  const filter = filters.status as FilterTab;
  const search = filters.q;

  function setFilters(next: typeof filters, nextPage = 1) {
    setFiltersState(next);
    const query = writeFilters(next, nextPage).toString();
    router.replace(query ? `/admin/dashboard?${query}` : "/admin/dashboard", { scroll: false });
  }

  const setFilter = (status: FilterTab) => setFilters({ ...filters, status });
  const setSearch = (q: string) => setFilters({ ...filters, q });
  const tabPicked = useRef(false);
  const [selected, setSelected] = useState<Member | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [proofZoom, setProofZoom] = useState(false);
  const [showRejectPicker, setShowRejectPicker] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkReason, setBulkReason] = useState<string>(REJECTION_REASONS[0]);
  const [bulkAge, setBulkAge] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState<string>(REJECTION_REASONS[0]);
  const [page, setPage] = useState(1);
  const [lastFilterKey, setLastFilterKey] = useState("PENDING|");
  const [resetLoading, setResetLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [tempPasswordHours, setTempPasswordHours] = useState(DEFAULT_SETTINGS.tempPasswordHours);
  const [accountPhoneInput, setAccountPhoneInput] = useState("");
  const [attachAccountLoading, setAttachAccountLoading] = useState(false);
  const [attachAccountError, setAttachAccountError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const [showManualAdd, setShowManualAdd] = useState(false);

  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  const [orphanAges, setOrphanAges] = useState<OrphanAge[]>([]);
  const [showAgeGroups, setShowAgeGroups] = useState(false);

  useEffect(() => {
    fetchMembers();
    fetchAgeGroups();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchMembers() {
    try {
      const data = await api.get<{ members: Member[] }>("/api/admin/members");
      const loaded = data.members || [];
      setMembers(loaded);
      // The default tab is a guess about what needs attention. An address that
      // already names a status is not a guess, so it wins.
      if (!tabPicked.current) {
        tabPicked.current = true;
        if (!searchParams.get("status")) setFilter(initialFilterTab(loaded));
      }
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      if (status === 401 || status === 0) router.push(loginPathWithNext("/admin/login"));
    } finally {
      setLoading(false);
    }
  }

  async function fetchAgeGroups() {
    try {
      const data = await api.get<{ ageGroups: AgeGroup[]; orphans: OrphanAge[] }>(
        "/api/admin/age-groups",
      );
      setAgeGroups(data.ageGroups || []);
      setOrphanAges(data.orphans || []);
    } catch {
      // non-critical — the age select just falls back to an empty list
    }
  }

  // Advances to the next row on the current page instead of just closing —
  // lets an admin work through a queue of obvious cases without returning
  // to the list after every single decision (cf. AGENTS.md UX TODO, F).
  async function validate(id: string, action: "ACTIVE" | "REJECTED", reason?: string) {
    setActionLoading(true);
    try {
      await api.post("/api/admin/validate", {
        id,
        action,
        ...(reason ? { rejectionReason: reason } : {}),
      });
      const idx = paginated.findIndex((m) => m.id === id);
      const next = idx !== -1 ? paginated[idx + 1] : undefined;
      await fetchMembers();
      setSelected(next && next.id !== id ? next : null);
      setShowRejectPicker(false);
      setProofZoom(false);
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setActionLoading(false);
    }
  }

  function rejectWithReason(id: string) {
    validate(id, "REJECTED", rejectReason);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // A batch used to be approve-only, so that a rejection always carried a
  // reason the member could act on. Rejecting in a batch keeps that: the
  // reason is picked for the batch before anything is sent, and the same one
  // reaches every member in it. What it does not allow is a blank reason.
  async function runOnSelection(action: "ACTIVE" | "REJECTED", reason: string | null, ask: string) {
    if (selectedIds.size === 0) return;
    if (!confirm(ask)) return;
    setBulkLoading(true);
    try {
      const results = await Promise.allSettled(
        Array.from(selectedIds).map((id) =>
          api.post("/api/admin/validate", {
            id,
            action,
            ...(reason ? { rejectionReason: reason } : {}),
          }),
        ),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      setSelectedIds(new Set());
      await fetchMembers();
      if (failed > 0) alert(`تعذّر تنفيذ ${failed} من الطلبات`);
    } catch {
      alert("حدث خطأ أثناء التنفيذ الجماعي");
    } finally {
      setBulkLoading(false);
    }
  }

  // Moving a batch to another عصر is the one correction the list can do on its
  // own: it changes nothing a member sees except the group they compete in, and
  // it is the field most of them get wrong on the form.
  async function bulkMoveAge() {
    if (selectedIds.size === 0 || !bulkAge) return;
    if (!confirm(`نقل ${selectedIds.size} عضو إلى عصر ${bulkAge}؟`)) return;
    setBulkLoading(true);
    try {
      const results = await Promise.allSettled(
        Array.from(selectedIds).map((id) =>
          api.patch(`/api/admin/members/${id}`, { age: bulkAge }),
        ),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      setSelectedIds(new Set());
      setBulkAge("");
      await fetchMembers();
      if (failed > 0) alert(`تعذّر نقل ${failed} من الأعضاء`);
    } catch {
      alert("حدث خطأ أثناء التنفيذ الجماعي");
    } finally {
      setBulkLoading(false);
    }
  }

  function bulkApprove() {
    return runOnSelection("ACTIVE", null, `قبول ${selectedIds.size} طلب دفعة واحدة؟`);
  }

  function bulkReject() {
    return runOnSelection(
      "REJECTED",
      bulkReason,
      `رفض ${selectedIds.size} طلب دفعة واحدة بسبب: ${bulkReason}؟`,
    );
  }

  async function deleteMember(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب نهائياً؟ لا يمكن التراجع عن هذا الإجراء.")) return;
    setDeleteLoading(true);
    try {
      await api.del(`/api/admin/members/${id}`);
      await fetchMembers();
      setSelected(null);
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setDeleteLoading(false);
    }
  }

  async function resetPassword(userId: string) {
    setResetLoading(true);
    setTempPassword(null);
    try {
      const data = await api.post<{ tempPassword: string; hours: number }>(
        "/api/admin/reset-password",
        { userId },
      );
      setTempPassword(data.tempPassword);
      setTempPasswordHours(data.hours);
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setResetLoading(false);
    }
  }

  async function attachAccount(memberId: string) {
    setAttachAccountError("");
    if (!accountPhoneInput.trim()) {
      setAttachAccountError("رقم الهاتف مطلوب");
      return;
    }
    setAttachAccountLoading(true);
    setTempPassword(null);
    try {
      const data = await api.patch<{ member: Member; tempPassword?: string }>(
        `/api/admin/members/${memberId}`,
        { accountPhone: accountPhoneInput.trim() },
      );
      setSelected(data.member);
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId ? { ...m, userId: data.member.userId, phone: data.member.phone } : m,
        ),
      );
      if (data.tempPassword) setTempPassword(data.tempPassword);
      setAccountPhoneInput("");
    } catch (e) {
      setAttachAccountError(errorMessage(e));
    } finally {
      setAttachAccountLoading(false);
    }
  }

  function exportCSV() {
    const headers = [
      "الاسم الكامل",
      "رقم الهاتف",
      "العصر",
      "طريقة الدفع",
      "الحالة",
      "رقم العضوية",
      "تاريخ الطلب",
    ];
    const rows = members.map((m) => [
      m.fullName,
      m.user?.phone || "",
      m.age,
      m.paymentMethod,
      STATUS_LABEL[m.status],
      m.memberNumber || "",
      formatDateTime(m.createdAt),
    ]);
    downloadCsv(`members-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rows));
  }

  const counts = {
    ALL: members.length,
    PENDING: members.filter((m) => m.status === "PENDING").length,
    ACTIVE: members.filter((m) => m.status === "ACTIVE").length,
    REJECTED: members.filter((m) => m.status === "REJECTED").length,
  };

  const ageBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    members.forEach((m) => {
      map[m.age] = (map[m.age] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [members]);

  const paymentBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    members.forEach((m) => {
      map[m.paymentMethod] = (map[m.paymentMethod] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [members]);

  const signupsByDay = useMemo(() => {
    const days: { label: string; value: number }[] = [];
    const counts: Record<string, number> = {};
    members.forEach((m) => {
      const key = new Date(m.createdAt).toISOString().slice(0, 10);
      counts[key] = (counts[key] || 0) + 1;
    });
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ label: String(d.getDate()), value: counts[key] || 0 });
    }
    return days;
  }, [members]);

  const filtered = members.filter((m) => matchesFilters(m, filters, MEMBERSHIP_FEE));
  const filterKey = JSON.stringify(filters);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const visibleIds = paginated.map((m) => m.id);
  const allOnPageSelected = allSelected(visibleIds, selectedIds);

  function toggleAllOnPage() {
    setSelectedIds((prev) => toggleAll(visibleIds, prev));
  }

  // Keyboard-driven review: a/r/n so a straightforward case (proof already
  // visible in the drawer) can be resolved without touching the mouse —
  // 1-5 pick a rejection reason once the picker is open. Ignored while
  // typing in a field, and while any request is in flight.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!selected || actionLoading) return;
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (showRejectPicker) {
        if (e.key === "Escape") {
          setShowRejectPicker(false);
          return;
        }
        const reasonIdx = Number(e.key) - 1;
        if (Number.isInteger(reasonIdx) && reasonIdx >= 0 && reasonIdx < REJECTION_REASONS.length) {
          e.preventDefault();
          const reason = REJECTION_REASONS[reasonIdx];
          setRejectReason(reason);
          validate(selected.id, "REJECTED", reason);
        }
        return;
      }

      if (e.key === "Escape") {
        setSelected(null);
      } else if (e.key.toLowerCase() === "a" && selected.status === "PENDING") {
        e.preventDefault();
        validate(selected.id, "ACTIVE");
      } else if (
        e.key.toLowerCase() === "r" &&
        (selected.status === "PENDING" || selected.status === "ACTIVE")
      ) {
        e.preventDefault();
        setShowRejectPicker(true);
      } else if (e.key.toLowerCase() === "n" || e.key === "ArrowDown") {
        e.preventDefault();
        const idx = paginated.findIndex((m) => m.id === selected.id);
        if (idx !== -1 && paginated[idx + 1]) {
          setSelected(paginated[idx + 1]);
          setProofZoom(false);
          setTempPassword(null);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const idx = paginated.findIndex((m) => m.id === selected.id);
        if (idx > 0) {
          setSelected(paginated[idx - 1]);
          setProofZoom(false);
          setTempPassword(null);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // validate is recreated every render; omitted below (re-subscribing the
    // listener each render would be harmless but pointless) — same pattern
    // already tolerated for fetchMembers above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, showRejectPicker, actionLoading, paginated]);

  return (
    <div className="admin-page">
      {/* Stat chips */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {(["ALL", "PENDING", "ACTIVE", "REJECTED"] as FilterTab[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className="rounded-xl py-3 px-2 text-center transition-all"
            style={{
              background: filter === s ? "var(--mint-700)" : "white",
              color: filter === s ? "white" : "var(--text-main)",
              boxShadow:
                filter === s ? "0 2px 8px rgba(26,63,51,0.25)" : "0 1px 4px rgba(0,0,0,0.06)",
              border: filter === s ? "none" : "1px solid var(--mint-100)",
            }}
          >
            <div className="text-xl font-black leading-none mb-0.5">{counts[s]}</div>
            <div className="text-xs font-semibold opacity-80">
              {s === "ALL"
                ? "الكل"
                : s === "PENDING"
                  ? "انتظار"
                  : s === "ACTIVE"
                    ? "مقبول"
                    : "مرفوض"}
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowStats((v) => !v)}
          className="flex-1 text-sm font-bold px-4 py-2.5 rounded-xl flex items-center justify-between"
          style={{
            background: "white",
            color: "var(--mint-700)",
            border: "1px solid var(--mint-100)",
          }}
        >
          <IconLabel name="chart">الإحصائيات</IconLabel>
          <Icon name={showStats ? "chevronUp" : "chevronDown"} size={14} />
        </button>
        <button
          onClick={exportCSV}
          aria-label="تصدير CSV"
          title="تصدير CSV"
          className="text-sm font-bold px-4 py-2.5 rounded-xl flex items-center"
          style={{
            background: "white",
            color: "var(--mint-700)",
            border: "1px solid var(--mint-100)",
          }}
        >
          <Icon name="download" size={18} />
        </button>
      </div>

      {showStats && (
        <div className="space-y-3 mb-5">
          <div className="card p-4">
            <p className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>
              التسجيلات خلال آخر 14 يوماً
            </p>
            <BarChart data={signupsByDay} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4">
              <p className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>
                حسب العصر
              </p>
              <div className="space-y-1.5">
                {ageBreakdown.map(([age, count]) => (
                  <div key={age} className="flex items-center justify-between text-xs">
                    <span style={{ color: "var(--text-main)" }} className="truncate">
                      {age}
                    </span>
                    <span className="font-black shrink-0" style={{ color: "var(--mint-600)" }}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-4">
              <p className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>
                حسب طريقة الدفع
              </p>
              <div className="space-y-1.5">
                {paymentBreakdown.map(([method, count]) => (
                  <div key={method} className="flex items-center justify-between text-xs">
                    <span style={{ color: "var(--text-main)" }} className="truncate">
                      {method}
                    </span>
                    <span className="font-black shrink-0" style={{ color: "var(--mint-600)" }}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search + manual add */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="بحث بالاسم أو الهاتف أو رمز الطلب..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input flex-1"
          style={{ background: "white" }}
        />
        <button
          onClick={() => setShowAgeGroups(true)}
          className="text-sm font-bold px-4 rounded-xl"
          style={{
            background: "white",
            color: "var(--mint-700)",
            border: "1px solid var(--mint-100)",
          }}
        >
          <IconLabel name="tag">الأعصار</IconLabel>
        </button>
        <button
          onClick={() => setShowManualAdd(true)}
          className="btn btn-primary text-sm px-4"
          style={{ width: "auto" }}
        >
          <IconLabel name="plus">إضافة عضو يدوياً</IconLabel>
        </button>
      </div>

      {/* Criteria that could not be combined before: an age, a payment method
          and how much has actually been paid, on top of the status tab. */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <select
          value={filters.age}
          onChange={(e) => setFilters({ ...filters, age: e.target.value })}
          className="input text-xs"
          style={{ width: "auto" }}
          aria-label="تصفية حسب العصر"
        >
          <option value="">كل الأعصار</option>
          {ageGroups.map((g) => (
            <option key={g.id} value={g.name}>
              {g.name}
            </option>
          ))}
        </select>

        <select
          value={filters.method}
          onChange={(e) => setFilters({ ...filters, method: e.target.value })}
          className="input text-xs"
          style={{ width: "auto" }}
          aria-label="تصفية حسب طريقة الدفع"
        >
          <option value="">كل طرق الدفع</option>
          {[...new Set(members.map((m) => m.paymentMethod).filter(Boolean))].map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>

        <select
          value={filters.paid}
          onChange={(e) => setFilters({ ...filters, paid: e.target.value })}
          className="input text-xs"
          style={{ width: "auto" }}
          aria-label="تصفية حسب المبلغ المدفوع"
        >
          <option value="">كل المبالغ</option>
          <option value="full">دفع كامل</option>
          <option value="partial">دفع ناقص</option>
          <option value="none">لم يدفع</option>
        </select>

        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {filtered.length} نتيجة
        </span>

        {activeFilterCount(filters) > 0 && (
          <button
            onClick={() => setFilters(NO_FILTERS)}
            className="text-xs font-bold"
            style={{ color: "var(--mint-700)" }}
          >
            <IconLabel name="close">إزالة التصفية ({activeFilterCount(filters)})</IconLabel>
          </button>
        )}
      </div>

      {paginated.length > 0 && (
        <label className="flex items-center gap-2 mb-2 text-xs font-bold cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4"
            checked={allOnPageSelected}
            onChange={toggleAllOnPage}
            aria-label="تحديد كل الطلبات المعروضة"
          />
          <span style={{ color: "var(--text-muted)" }}>تحديد كل المعروض ({paginated.length})</span>
        </label>
      )}

      {selectedIds.size > 0 && (
        <div
          className="card p-3 mb-3 space-y-2"
          style={{ background: "var(--mint-50)", border: "1px solid var(--mint-300)" }}
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
              {selectedIds.size} محدد
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs px-3 py-1.5 rounded-lg font-bold"
                style={{
                  background: "white",
                  color: "var(--text-muted)",
                  border: "1px solid var(--mint-200)",
                }}
              >
                إلغاء
              </button>
              {filter === "PENDING" && (
                <>
                  <button
                    onClick={bulkReject}
                    disabled={bulkLoading}
                    className="text-xs px-3 py-1.5 rounded-lg font-bold"
                    style={{ background: "#fee2e2", color: "#991b1b" }}
                  >
                    {bulkLoading ? "..." : <IconLabel name="close">رفض الكل</IconLabel>}
                  </button>
                  <button
                    onClick={bulkApprove}
                    disabled={bulkLoading}
                    className="text-xs px-3 py-1.5 rounded-lg font-bold"
                    style={{ background: "var(--mint-600)", color: "white" }}
                  >
                    {bulkLoading ? (
                      "..."
                    ) : (
                      <IconLabel name="check">قبول الكل ({selectedIds.size})</IconLabel>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
          {filter === "PENDING" && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="bulk-reason"
                className="text-xs font-bold shrink-0"
                style={{ color: "var(--text-muted)" }}
              >
                سبب الرفض
              </label>
              <select
                id="bulk-reason"
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                className="input text-xs flex-1 min-w-0"
              >
                {REJECTION_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* The one correction that is worth doing in a batch: a whole group
              of members picked the wrong عصر on their own form. */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="bulk-age"
              className="text-xs font-bold shrink-0"
              style={{ color: "var(--text-muted)" }}
            >
              نقل إلى عصر
            </label>
            <select
              id="bulk-age"
              value={bulkAge}
              onChange={(e) => setBulkAge(e.target.value)}
              className="input text-xs flex-1 min-w-0"
            >
              <option value="">اختر العصر</option>
              {ageGroups.map((g) => (
                <option key={g.id} value={g.name}>
                  {g.name}
                </option>
              ))}
            </select>
            <button
              onClick={bulkMoveAge}
              disabled={bulkLoading || !bulkAge}
              className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0 disabled:opacity-40"
              style={{ background: "var(--mint-600)", color: "white" }}
            >
              {bulkLoading ? "..." : <IconLabel name="check">نقل ({selectedIds.size})</IconLabel>}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-16" style={{ color: "var(--mint-500)" }}>
          <div className="text-4xl animate-pulse mb-3">⏳</div>
          <p className="text-sm font-semibold">جاري التحميل...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center" style={{ color: "var(--text-muted)" }}>
          <div className="text-4xl mb-3">📭</div>
          <p className="font-semibold">لا توجد طلبات في هذا القسم</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map((m) => (
            <div
              key={m.id}
              onClick={() => {
                setSelected(m);
                setProofZoom(false);
                setTempPassword(null);
                setShowRejectPicker(false);
              }}
              className="card w-full p-4 text-right transition-all hover:shadow-md cursor-pointer"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {
                    <input
                      type="checkbox"
                      checked={selectedIds.has(m.id)}
                      onChange={() => toggleSelected(m.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 shrink-0"
                      aria-label={`تحديد ${m.fullName}`}
                    />
                  }
                  {m.photo ? (
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={toThumbUrl(`/api/files/${m.photo}`)}
                        alt={m.fullName}
                        width={40}
                        height={40}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-black text-white"
                      style={{
                        background:
                          m.status === "ACTIVE"
                            ? "var(--mint-600)"
                            : m.status === "REJECTED"
                              ? "#dc2626"
                              : "var(--copper-500)",
                      }}
                    >
                      <Icon name="user" size={20} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold truncate" style={{ color: "var(--text-main)" }}>
                      {m.fullName}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }} dir="ltr">
                      {m.user?.phone || "غير معروف"}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className={`badge ${STATUS_BADGE[m.status]}`}>
                    {STATUS_LABEL[m.status]}
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>›</span>
                </div>
              </div>
              <div
                className="flex gap-3 mt-2 text-xs"
                style={{ color: "var(--text-muted)", paddingRight: "52px" }}
              >
                <span>العصر: {m.age}</span>
                <span>•</span>
                <span>{m.paymentMethod}</span>
                <span>•</span>
                <span dir="ltr">{formatDateTime(m.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-3">
          <button
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="text-xs px-3 py-1.5 rounded-lg font-bold disabled:opacity-40 inline-flex items-center gap-1"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            <Icon name="chevronRight" size={14} />
            السابق
          </button>
          <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
            صفحة {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="text-xs px-3 py-1.5 rounded-lg font-bold disabled:opacity-40 inline-flex items-center gap-1"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            التالي
            <Icon name="chevronLeft" size={14} />
          </button>
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelected(null);
              setProofZoom(false);
              setTempPassword(null);
              setShowRejectPicker(false);
            }
          }}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl md:rounded-2xl overflow-y-auto"
            style={{ background: "var(--mint-50)", maxHeight: "92svh", direction: "rtl" }}
          >
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 rounded-full" style={{ background: "var(--mint-300)" }} />
            </div>

            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
            >
              <h2 className="font-black text-white text-lg">تفاصيل الطلب</h2>
              <button
                onClick={() => {
                  setSelected(null);
                  setProofZoom(false);
                  setTempPassword(null);
                  setShowRejectPicker(false);
                }}
                aria-label="إغلاق"
                className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                style={{ background: "rgba(255,255,255,0.15)" }}
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <SamePersonWarning memberId={selected.id} />

              {/* Photo + name */}
              <div className="card p-4 flex items-center gap-4">
                <div className="relative shrink-0">
                  {selected.photo ? (
                    <div className="w-16 h-16 rounded-full overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/files/${selected.photo}`}
                        alt={selected.fullName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black text-white"
                      style={{ background: "var(--mint-600)" }}
                    >
                      <Icon name="user" size={26} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-lg truncate" style={{ color: "var(--text-main)" }}>
                    {selected.fullName}
                  </p>
                </div>
                <Link
                  href={`/admin/members/${selected.id}`}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg shrink-0"
                  style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
                >
                  <IconLabel name="pencil">تعديل</IconLabel>
                </Link>
              </div>

              {/* Info */}
              <div className="card p-4 space-y-3">
                {(
                  [
                    ["رقم الهاتف", selected.user?.phone || "غير معروف", "ltr"],
                    ["العصر", selected.age, undefined],
                    ["طريقة الدفع", selected.paymentMethod, undefined],
                    [
                      "المبلغ المسدد",
                      selected.paidAmount ? `${selected.paidAmount} أوقية` : "—",
                      undefined,
                    ],
                    ["رقم العضوية", selected.memberNumber || "—", "ltr"],
                    ["تاريخ الطلب", formatDate(selected.createdAt), undefined],
                    ["وقت الطلب", formatTime(selected.createdAt), "ltr"],
                  ] as [string, string, string | undefined][]
                ).map(([label, value, dir]) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <span className="text-sm shrink-0" style={{ color: "var(--text-muted)" }}>
                      {label}
                    </span>
                    <span
                      className="text-sm font-bold"
                      style={{ color: "var(--text-main)" }}
                      dir={dir}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Status */}
              <div className="flex items-center justify-between card p-4">
                <span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
                  الحالة
                </span>
                <span className={`badge ${STATUS_BADGE[selected.status]}`}>
                  {STATUS_LABEL[selected.status]}
                </span>
              </div>

              {/* Registered activities */}
              {selected.registrations && selected.registrations.length > 0 && (
                <div className="card p-4">
                  <p className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
                    الأنشطة المسجل بها
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.registrations.map((r) => (
                      <span key={r.activityId} className="badge badge-active">
                        {r.activity.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Reset password / attach account */}
              <div className="card p-4">
                {selected.userId ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
                      <IconLabel name="key">كلمة مرور الحساب</IconLabel>
                    </span>
                    <button
                      onClick={() => resetPassword(selected.userId!)}
                      disabled={resetLoading}
                      className="text-xs px-3 py-1.5 rounded-lg font-bold"
                      style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
                    >
                      {resetLoading ? "..." : "إعادة تعيين"}
                    </button>
                  </div>
                ) : (
                  <div>
                    <p
                      className="text-sm font-semibold mb-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      📵 لا يوجد حساب مرتبط — رقم الهاتف غير معروف
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="tel"
                        dir="ltr"
                        value={accountPhoneInput}
                        onChange={(e) =>
                          setAccountPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 8))
                        }
                        placeholder="2XXXXXXX"
                        maxLength={8}
                        className="input text-sm"
                      />
                      <button
                        onClick={() => attachAccount(selected.id)}
                        disabled={attachAccountLoading}
                        className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
                        style={{ background: "var(--mint-600)", color: "white" }}
                      >
                        {attachAccountLoading ? "..." : "إنشاء حساب"}
                      </button>
                    </div>
                    {attachAccountError && (
                      <p className="text-xs mt-1.5" style={{ color: "#dc2626" }}>
                        {attachAccountError}
                      </p>
                    )}
                  </div>
                )}
                {tempPassword && (
                  <div
                    className="mt-3 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2"
                    style={{ background: "var(--mint-50)", border: "1px solid var(--mint-200)" }}
                  >
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>
                        كلمة المرور المؤقتة — سلّمها للعضو
                      </p>
                      <p
                        className="font-mono font-black text-lg"
                        style={{ color: "var(--mint-700)" }}
                        dir="ltr"
                      >
                        {tempPassword}
                      </p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        صالحة {hoursLabel(tempPasswordHours)}، وسيُطلب منه تغييرها عند الدخول
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(tempPassword)}
                      className="text-xs px-2.5 py-1.5 rounded-lg font-bold shrink-0"
                      style={{ background: "var(--mint-600)", color: "white" }}
                    >
                      نسخ
                    </button>
                  </div>
                )}
              </div>

              <Link
                href={`/admin/members/${selected.id}`}
                className="text-xs font-bold block"
                style={{ color: "var(--mint-600)" }}
              >
                <ArrowLabel>الملف الكامل للعضو</ArrowLabel>
              </Link>

              {/* Proof image */}
              <div>
                <p className="text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>
                  <IconLabel name="camera">صورة الكابتير</IconLabel>
                </p>
                {selected.paymentProof ? (
                  <>
                    <div
                      className="rounded-2xl overflow-hidden cursor-zoom-in border-2"
                      style={{ borderColor: "var(--mint-300)" }}
                      onClick={() => setProofZoom(true)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/files/${selected.paymentProof}`}
                        alt="كابتير"
                        className="w-full object-contain max-h-56"
                        style={{ background: "#f3f4f6" }}
                      />
                    </div>
                    <p className="text-xs text-center mt-1" style={{ color: "var(--text-muted)" }}>
                      انقر للتكبير
                    </p>
                    <ProofReuseWarning
                      filename={selected.paymentProof}
                      kind="member"
                      id={selected.id}
                    />
                  </>
                ) : (
                  <p
                    className="text-sm card p-3 text-center"
                    style={{ color: "var(--text-muted)" }}
                  >
                    أُضيف يدوياً من طرف المشرف — لا يوجد إثبات دفع
                  </p>
                )}
              </div>

              {/* Actions */}
              {(selected.status === "PENDING" || selected.status === "ACTIVE") && (
                <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
                  ⌨️ اختصارات: A قبول — R رفض — N التالي
                </p>
              )}
              {selected.status === "PENDING" && !showRejectPicker && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => validate(selected.id, "ACTIVE")}
                    disabled={actionLoading}
                    className="btn btn-primary text-sm"
                  >
                    {actionLoading ? "..." : <IconLabel name="check">قبول</IconLabel>}
                  </button>
                  <button
                    onClick={() => setShowRejectPicker(true)}
                    disabled={actionLoading}
                    className="btn text-sm font-bold"
                    style={{ background: "#dc2626", color: "white" }}
                  >
                    ❌ رفض
                  </button>
                </div>
              )}
              {selected.status === "ACTIVE" && !showRejectPicker && (
                <button
                  onClick={() => setShowRejectPicker(true)}
                  disabled={actionLoading}
                  className="btn w-full text-sm font-bold"
                  style={{ background: "#fee2e2", color: "#991b1b" }}
                >
                  تغيير إلى مرفوض
                </button>
              )}
              {(selected.status === "PENDING" || selected.status === "ACTIVE") &&
                showRejectPicker && (
                  <div className="card p-3 space-y-2.5" style={{ background: "var(--mint-50)" }}>
                    <label
                      className="block text-xs font-bold"
                      style={{ color: "var(--text-main)" }}
                      htmlFor="dash-field-3"
                    >
                      سبب الرفض — سيظهر للعضو (أو اضغط رقم 1-{REJECTION_REASONS.length} مباشرة)
                    </label>
                    <select
                      id="dash-field-3"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="input text-sm"
                    >
                      {REJECTION_REASONS.map((r, i) => (
                        <option key={r} value={r}>
                          {i + 1}. {r}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowRejectPicker(false)}
                        disabled={actionLoading}
                        className="btn text-sm"
                        style={{
                          background: "white",
                          color: "var(--text-muted)",
                          border: "1px solid var(--mint-200)",
                        }}
                      >
                        إلغاء
                      </button>
                      <button
                        onClick={() => rejectWithReason(selected.id)}
                        disabled={actionLoading}
                        className="btn text-sm font-bold flex-1"
                        style={{ background: "#dc2626", color: "white" }}
                      >
                        {actionLoading ? "..." : "تأكيد الرفض"}
                      </button>
                    </div>
                  </div>
                )}
              {selected.status === "REJECTED" && (
                <>
                  {selected.rejectionReason && (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      سبب الرفض: <span className="font-bold">{selected.rejectionReason}</span>
                    </p>
                  )}
                  <button
                    onClick={() => validate(selected.id, "ACTIVE")}
                    disabled={actionLoading}
                    className="btn btn-primary w-full text-sm"
                  >
                    {actionLoading ? "..." : "تغيير إلى مقبول"}
                  </button>
                </>
              )}

              <button
                onClick={() => deleteMember(selected.id)}
                disabled={deleteLoading}
                className="btn w-full text-sm font-bold"
                style={{ background: "white", color: "#991b1b", border: "1.5px solid #fca5a5" }}
              >
                {deleteLoading ? "..." : "🗑 حذف الطلب نهائياً"}
              </button>

              <div className="pb-2" />
            </div>
          </div>
        </div>
      )}

      {/* Proof fullscreen zoom */}
      {proofZoom && selected?.paymentProof && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.92)" }}
          onClick={() => setProofZoom(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/files/${selected.paymentProof}`}
            alt="كابتير"
            className="max-w-full max-h-full object-contain rounded-2xl"
          />
          <button
            aria-label="إغلاق"
            className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center text-white"
            style={{ background: "rgba(255,255,255,0.15)" }}
            onClick={() => setProofZoom(false)}
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      )}

      {showManualAdd && (
        <ManualAddDialog
          ageGroups={ageGroups}
          onCreated={fetchMembers}
          onManageAgeGroups={() => {
            setShowManualAdd(false);
            setShowAgeGroups(true);
          }}
          onClose={() => setShowManualAdd(false)}
        />
      )}

      {showAgeGroups && (
        <AgeGroupsDialog
          ageGroups={ageGroups}
          orphans={orphanAges}
          onChanged={() => {
            fetchAgeGroups();
            fetchMembers();
          }}
          onClose={() => setShowAgeGroups(false)}
        />
      )}
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={null}>
      <AdminDashboardInner />
    </Suspense>
  );
}
