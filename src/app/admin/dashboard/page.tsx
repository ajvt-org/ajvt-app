"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginPathWithNext } from "@/lib/utils";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { REJECTION_REASONS } from "@/lib/rejectionReasons";
import { readFilters, writeFilters, matchesFilters } from "@/lib/memberFilters";
import { api, ApiError, errorMessage } from "@/lib/api";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import type { FilterTab, Member, AgeGroup, OrphanAge } from "./types";
import { PAGE_SIZE } from "./constants";
import { initialFilterTab } from "./initialTab";
import { useReviewShortcuts } from "./useReviewShortcuts";
import { statusCounts, ageBreakdown, paymentBreakdown, signupsByDay } from "./memberStats";
import { exportMembers } from "./exportMembers";
import AgeGroupsDialog from "./AgeGroupsDialog";
import ManualAddDialog from "./ManualAddDialog";
import StatTabs from "./StatTabs";
import StatsPanel from "./StatsPanel";
import DashboardToolbar from "./DashboardToolbar";
import MemberSearch from "./MemberSearch";
import MemberFilterRow from "./MemberFilterRow";
import BulkActionsBar from "./BulkActionsBar";
import MemberList from "./MemberList";
import Pagination from "./Pagination";
import MemberDrawer from "./MemberDrawer";
import ProofZoom from "./ProofZoom";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";

function AdminDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFiltersState] = useState(
    readFilters(new URLSearchParams(searchParams.toString())),
  );
  const filter = filters.status as FilterTab;
  const tabPicked = useRef(false);

  const [selected, setSelected] = useState<Member | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [proofZoom, setProofZoom] = useState(false);
  const [showRejectPicker, setShowRejectPicker] = useState(false);
  const [rejectReason, setRejectReason] = useState<string>(REJECTION_REASONS[0]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkReason, setBulkReason] = useState<string>(REJECTION_REASONS[0]);
  const [bulkAge, setBulkAge] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [lastFilterKey, setLastFilterKey] = useState("PENDING|");

  const [resetLoading, setResetLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [tempPasswordHours, setTempPasswordHours] = useState(DEFAULT_SETTINGS.tempPasswordHours);
  const [accountPhoneInput, setAccountPhoneInput] = useState("");
  const [attachAccountLoading, setAttachAccountLoading] = useState(false);
  const [attachAccountError, setAttachAccountError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Member | null>(null);

  const [showStats, setShowStats] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [showAgeGroups, setShowAgeGroups] = useState(false);
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  const [orphanAges, setOrphanAges] = useState<OrphanAge[]>([]);

  function setFilters(next: typeof filters, nextPage = 1) {
    setFiltersState(next);
    const query = writeFilters(next, nextPage).toString();
    router.replace(query ? `/admin/dashboard?${query}` : "/admin/dashboard", { scroll: false });
  }

  const setFilter = (status: FilterTab) => setFilters({ ...filters, status });

  useEffect(() => {
    fetchMembers();
    fetchAgeGroups();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchMembers() {
    try {
      const data = await api.get<{ members: Member[] }>("/api/admin/members");
      const loaded = data.members || [];
      setMembers(loaded);
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
    } catch {}
  }

  function closeDrawer() {
    setSelected(null);
    setProofZoom(false);
    setTempPassword(null);
    setShowRejectPicker(false);
  }

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

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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

  async function deleteMember(id: string, confirmName: string) {
    setDeleteLoading(true);
    try {
      await api.del(`/api/admin/members/${id}`, { confirmName });
      setConfirmDelete(null);
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

  const counts = statusCounts(members);
  const byAge = useMemo(() => ageBreakdown(members), [members]);
  const byPayment = useMemo(() => paymentBreakdown(members), [members]);
  const signups = useMemo(() => signupsByDay(members), [members]);
  const paymentMethods = useMemo(
    () => [...new Set(members.map((m) => m.paymentMethod).filter(Boolean))],
    [members],
  );

  const filtered = members.filter((m) => matchesFilters(m, filters, MEMBERSHIP_FEE));
  const filterKey = JSON.stringify(filters);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useReviewShortcuts({
    selected,
    paginated,
    actionLoading,
    showRejectPicker,
    setShowRejectPicker,
    setRejectReason,
    onValidate: validate,
    onClose: () => setSelected(null),
    onStep: (next) => {
      setSelected(next);
      setProofZoom(false);
      setTempPassword(null);
    },
  });

  return (
    <div className="admin-page">
      <StatTabs active={filter} counts={counts} onPick={setFilter} />

      <DashboardToolbar
        statsOpen={showStats}
        onToggleStats={() => setShowStats((v) => !v)}
        onExport={() => exportMembers(members)}
      />

      {showStats && <StatsPanel signups={signups} byAge={byAge} byPayment={byPayment} />}

      <MemberSearch
        value={filters.q}
        onChange={(q) => setFilters({ ...filters, q })}
        onManageAgeGroups={() => setShowAgeGroups(true)}
        onManualAdd={() => setShowManualAdd(true)}
      />

      <MemberFilterRow
        filters={filters}
        ageGroups={ageGroups}
        paymentMethods={paymentMethods}
        resultCount={filtered.length}
        onChange={setFilters}
      />

      {selectedIds.size > 0 && (
        <BulkActionsBar
          count={selectedIds.size}
          pending={filter === "PENDING"}
          loading={bulkLoading}
          reason={bulkReason}
          age={bulkAge}
          ageGroups={ageGroups}
          onReason={setBulkReason}
          onAge={setBulkAge}
          onClear={() => setSelectedIds(new Set())}
          onApprove={() =>
            runOnSelection("ACTIVE", null, `قبول ${selectedIds.size} طلب دفعة واحدة؟`)
          }
          onReject={() =>
            runOnSelection(
              "REJECTED",
              bulkReason,
              `رفض ${selectedIds.size} طلب دفعة واحدة بسبب: ${bulkReason}؟`,
            )
          }
          onMoveAge={bulkMoveAge}
        />
      )}

      <MemberList
        members={paginated}
        loading={loading}
        empty={filtered.length === 0}
        selectedIds={selectedIds}
        onToggle={toggleSelected}
        onOpen={(m) => {
          setSelected(m);
          setProofZoom(false);
          setTempPassword(null);
          setShowRejectPicker(false);
        }}
      />

      <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />

      {selected && (
        <MemberDrawer
          member={selected}
          actionLoading={actionLoading}
          deleteLoading={deleteLoading}
          resetLoading={resetLoading}
          tempPassword={tempPassword}
          tempPasswordHours={tempPasswordHours}
          accountPhone={accountPhoneInput}
          attachLoading={attachAccountLoading}
          attachError={attachAccountError}
          showRejectPicker={showRejectPicker}
          rejectReason={rejectReason}
          onClose={closeDrawer}
          onZoomProof={() => setProofZoom(true)}
          onResetPassword={() => resetPassword(selected.userId!)}
          onAccountPhone={setAccountPhoneInput}
          onAttachAccount={() => attachAccount(selected.id)}
          onRejectReason={setRejectReason}
          onOpenRejectPicker={() => setShowRejectPicker(true)}
          onCloseRejectPicker={() => setShowRejectPicker(false)}
          onApprove={() => validate(selected.id, "ACTIVE")}
          onReject={() => validate(selected.id, "REJECTED", rejectReason)}
          onDelete={() => setConfirmDelete(selected)}
        />
      )}

      {confirmDelete && (
        <ConfirmDeleteDialog
          name={confirmDelete.fullName}
          loading={deleteLoading}
          onConfirm={(confirmName) => deleteMember(confirmDelete.id, confirmName)}
          onClose={() => setConfirmDelete(null)}
        />
      )}

      {proofZoom && selected?.paymentProof && (
        <ProofZoom filename={selected.paymentProof} onClose={() => setProofZoom(false)} />
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
