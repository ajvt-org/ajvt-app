"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginPathWithNext } from "@/lib/utils";
import { REJECTION_REASONS } from "@/lib/rejectionReasons";
import {
  readFilters,
  writeFilters,
  matchesFilters,
  membershipYearsPresent,
  upToDate,
  NO_FILTERS,
} from "@/lib/memberFilters";
import { api, ApiError, errorMessage } from "@/lib/api";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { pageCount, paginate } from "@/lib/listUrlState";
import type { FilterTab, Member, AgeGroup, OrphanAge, Village } from "./types";
import { PAGE_SIZE } from "./constants";
import { initialFilterTab } from "./initialTab";
import { useReviewShortcuts } from "./useReviewShortcuts";
import {
  statusCounts,
  ageBreakdown,
  villageBreakdown,
  paymentBreakdown,
  signupsByDay,
} from "./memberStats";
import { exportMembers } from "./exportMembers";
import AgeGroupsDialog from "./AgeGroupsDialog";
import VillagesDialog from "./VillagesDialog";
import ManualAddDialog from "./ManualAddDialog";
import StatTabs from "./StatTabs";
import StatsPanel from "./StatsPanel";
import MemberSearch from "./MemberSearch";
import FilterSheet from "./FilterSheet";
import FilterChips from "./FilterChips";
import UpToDateSummary from "./UpToDateSummary";
import { useMembershipSettings } from "./useMembershipSettings";
import BulkActionsBar from "./BulkActionsBar";
import MemberList from "./MemberList";
import BareAccountsSection from "./BareAccountsSection";
import { useBareAccounts } from "./useBareAccounts";
import { OTHER_VILLAGE } from "@/lib/villages";
import PageLoading from "@/components/PageLoading";
import MemberDrawer from "./MemberDrawer";
import ProofZoom from "./ProofZoom";

function AdminDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const membership = useMembershipSettings();
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

  const [showStats, setShowStats] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualAddPhone, setManualAddPhone] = useState("");
  const bare = useBareAccounts();
  const [showAgeGroups, setShowAgeGroups] = useState(false);
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  const [orphanAges, setOrphanAges] = useState<OrphanAge[]>([]);
  const [showVillages, setShowVillages] = useState(false);
  const [villages, setVillages] = useState<Village[]>([]);
  const [otherVillageCount, setOtherVillageCount] = useState(0);
  const [unlistedVillages, setUnlistedVillages] = useState<OrphanAge[]>([]);

  function setFilters(next: typeof filters, nextPage = 1) {
    setFiltersState(next);
    const query = writeFilters(next, nextPage).toString();
    router.replace(query ? `/admin/dashboard?${query}` : "/admin/dashboard", { scroll: false });
  }

  const setFilter = (status: FilterTab) => setFilters({ ...filters, status });

  useEffect(() => {
    fetchMembers();
    fetchAgeGroups();
    fetchVillages();
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

  async function refreshSelected() {
    if (!selected) return;
    const data = await api
      .get<{ members: Member[] }>("/api/admin/members")
      .catch(() => ({ members: [] as Member[] }));
    const loaded = data.members || [];
    if (loaded.length === 0) return;
    setMembers(loaded);
    const fresh = loaded.find((m) => m.id === selected.id);
    if (fresh) setSelected(fresh);
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

  async function fetchVillages() {
    try {
      const data = await api.get<{
        villages: Village[];
        otherCount: number;
        unlisted: OrphanAge[];
      }>("/api/admin/villages");
      setVillages(data.villages || []);
      setOtherVillageCount(data.otherCount || 0);
      setUnlistedVillages(data.unlisted || []);
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
  const byVillage = useMemo(() => villageBreakdown(members), [members]);
  const byPayment = useMemo(() => paymentBreakdown(members), [members]);
  const signups = useMemo(() => signupsByDay(members), [members]);
  const paymentMethods = useMemo(
    () => [...new Set(members.map((m) => m.paymentMethod).filter(Boolean))],
    [members],
  );
  const years = useMemo(() => membershipYearsPresent(members), [members]);
  const standing = useMemo(() => upToDate(members, membership), [members, membership]);

  const withStanding = (want: string) => ({
    ...NO_FILTERS,
    status: "ACTIVE",
    standing: filters.standing === want ? "" : want,
  });

  const filtered = members.filter((m) => matchesFilters(m, filters, membership));
  const filterKey = JSON.stringify(filters);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  const filterCount = [
    filters.age,
    filters.village,
    filters.method,
    filters.paid,
    filters.year,
    filters.standing,
    filters.from,
    filters.to,
  ].filter(Boolean).length;

  const totalPages = pageCount(filtered.length, PAGE_SIZE);
  const currentPage = Math.min(page, totalPages);
  const paginated = paginate(filtered, currentPage, PAGE_SIZE);

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
      <StatTabs
        active={filter}
        counts={{ ...counts, NO_REQUEST: bare.users.length }}
        onPick={setFilter}
      />

      {filter === "NO_REQUEST" ? (
        <BareAccountsSection
          users={bare.users}
          loading={bare.loading}
          onFill={(phone) => {
            setManualAddPhone(phone);
            setShowManualAdd(true);
          }}
          onChanged={bare.refresh}
        />
      ) : (
        <>
          <MemberSearch
            value={filters.q}
            filterCount={filterCount}
            statsOpen={showStats}
            onChange={(q) => setFilters({ ...filters, q })}
            onOpenFilters={() => setShowFilters(true)}
            onToggleStats={() => setShowStats((v) => !v)}
            onExport={() => exportMembers(members)}
            onManageAgeGroups={() => setShowAgeGroups(true)}
            onManageVillages={() => setShowVillages(true)}
            onManualAdd={() => setShowManualAdd(true)}
          />

          {showStats && (
            <StatsPanel
              signups={signups}
              byAge={byAge}
              byVillage={byVillage}
              byPayment={byPayment}
            />
          )}

          <UpToDateSummary
            year={membership.year}
            current={standing.current}
            active={standing.active}
            showing={
              filters.standing === "current" || filters.standing === "former"
                ? filters.standing
                : null
            }
            onShowCurrent={() => setFilters(withStanding("current"))}
            onShowFormer={() => setFilters(withStanding("former"))}
          />

          <FilterChips
            filters={filters}
            year={membership.year}
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
              onApprove={() => runOnSelection("ACTIVE", null, `قبول ${selectedIds.size} طلب دفع؟`)}
              onReject={() =>
                runOnSelection(
                  "REJECTED",
                  bulkReason,
                  `رفض ${selectedIds.size} طلب دفع بسبب: ${bulkReason}؟`,
                )
              }
              onMoveAge={bulkMoveAge}
            />
          )}

          {loading ? (
            <PageLoading />
          ) : (
            <MemberList
              members={paginated}
              selectedIds={selectedIds}
              onToggle={toggleSelected}
              onOpen={(m) => {
                setSelected(m);
                setProofZoom(false);
                setTempPassword(null);
                setShowRejectPicker(false);
              }}
              onRenamed={(id, fullName) => {
                setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, fullName } : m)));
                setSelected((prev) => (prev && prev.id === id ? { ...prev, fullName } : prev));
              }}
              pagination={{ page: currentPage, totalPages, onGo: setPage }}
            />
          )}
        </>
      )}

      {selected && (
        <MemberDrawer
          member={selected}
          actionLoading={actionLoading}
          settingsYear={membership.year}
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
          onProofSaved={refreshSelected}
          onResetPassword={() => resetPassword(selected.userId!)}
          onAccountPhone={setAccountPhoneInput}
          onAttachAccount={() => attachAccount(selected.id)}
          onRejectReason={setRejectReason}
          onOpenRejectPicker={() => setShowRejectPicker(true)}
          onCloseRejectPicker={() => setShowRejectPicker(false)}
          onApprove={() => validate(selected.id, "ACTIVE")}
          onReject={() => validate(selected.id, "REJECTED", rejectReason)}
        />
      )}

      {showFilters && (
        <FilterSheet
          filters={filters}
          ageGroups={ageGroups}
          villages={villages}
          paymentMethods={paymentMethods}
          years={years}
          year={membership.year}
          resultCount={filtered.length}
          onChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      {proofZoom && selected?.paymentProof && (
        <ProofZoom filename={selected.paymentProof} onClose={() => setProofZoom(false)} />
      )}

      {showManualAdd && (
        <ManualAddDialog
          ageGroups={ageGroups}
          initialPhone={manualAddPhone || undefined}
          onCreated={async () => {
            await fetchMembers();
            await bare.refresh();
          }}
          onManageAgeGroups={() => {
            setShowManualAdd(false);
            setShowAgeGroups(true);
          }}
          onManageVillages={() => {
            setShowManualAdd(false);
            setShowVillages(true);
          }}
          onClose={() => {
            setShowManualAdd(false);
            setManualAddPhone("");
          }}
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

      {showVillages && (
        <VillagesDialog
          villages={villages}
          otherCount={otherVillageCount}
          unlisted={unlistedVillages}
          onChanged={() => {
            fetchVillages();
            fetchMembers();
          }}
          onShowOther={() => {
            setShowVillages(false);
            setFilters({ ...filters, status: "ALL", village: OTHER_VILLAGE });
          }}
          onClose={() => setShowVillages(false)}
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
