"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginPathWithNext } from "@/lib/utils";
import { REJECTION_REASONS } from "@/lib/rejectionReasons";
import {
  MEMBER_FILTER_KEYS,
  readFilters,
  writeFilters,
  matchesFilters,
  membershipYearsPresent,
  upToDate,
  NO_FILTERS,
} from "@/lib/memberFilters";
import { api, ApiError, errorMessage } from "@/lib/api";
import { memberCardHref } from "@/lib/adminBackLink";
import { awaitsReview, nextAwaitingReview } from "@/lib/reviewQueue";
import { pageCount, paginate } from "@/lib/listUrlState";
import { useAdminListUrlState } from "@/hooks/useAdminListUrlState";
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
import MemberImportDialog from "./MemberImportDialog";
import StatTabs from "./StatTabs";
import StatsPanel from "./StatsPanel";
import MemberSearch from "./MemberSearch";
import FilterSheet from "./FilterSheet";
import FilterChips from "./FilterChips";
import UpToDateSummary from "./UpToDateSummary";
import { useMembershipSettings } from "@/components/admin/useMembershipSettings";
import BulkActionsBar from "./BulkActionsBar";
import MemberList from "./MemberList";
import BareAccountsSection from "./BareAccountsSection";
import { useBareAccounts } from "./useBareAccounts";
import { OTHER_VILLAGE } from "@/lib/villages";
import PageLoading from "@/components/PageLoading";
import { useAdminOrigin } from "@/components/admin/adminOrigin";
import ConfirmDialog from "@/components/ConfirmDialog";
import Notice from "@/components/Notice";
import MemberDrawer from "./MemberDrawer";
import { useBulkActions } from "./useBulkActions";
import ProofZoom from "./ProofZoom";

function AdminDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const origin = useAdminOrigin();
  const membership = useMembershipSettings();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const { filters, page, go, goToPage } = useAdminListUrlState("/admin/dashboard", {
    keys: [...MEMBER_FILTER_KEYS],
    readFilters,
    writeFilters,
  });
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
  const [reviewError, setReviewError] = useState("");

  const clearSelection = () => setSelectedIds(new Set());
  const bulk = useBulkActions({
    selectedIds,
    onCleared: () => {
      clearSelection();
      setBulkAge("");
    },
    onDone: () => fetchMembers(),
  });

  const [showStats, setShowStats] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [payFor, setPayFor] = useState<{ id: string; fullName: string } | null>(null);
  const bare = useBareAccounts();
  const [showAgeGroups, setShowAgeGroups] = useState(false);
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  const [orphanAges, setOrphanAges] = useState<OrphanAge[]>([]);
  const [showVillages, setShowVillages] = useState(false);
  const [villages, setVillages] = useState<Village[]>([]);
  const [otherVillageCount, setOtherVillageCount] = useState(0);
  const [unlistedVillages, setUnlistedVillages] = useState<OrphanAge[]>([]);

  const setFilter = (status: FilterTab) => go({ ...filters, status });

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
    setShowRejectPicker(false);
  }

  async function validate(id: string, action: "ACTIVE" | "REJECTED", reason?: string) {
    setActionLoading(true);
    setReviewError("");
    try {
      await api.post("/api/admin/validate", {
        id,
        action,
        ...(reason ? { rejectionReason: reason } : {}),
      });
      const next = nextAwaitingReview(paginated, id, 1);
      await fetchMembers();
      setSelected(next);
      setShowRejectPicker(false);
      setProofZoom(false);
    } catch (e) {
      setReviewError(errorMessage(e));
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
          onFill={(person) => {
            setPayFor(person);
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
            onChange={(q) => go({ ...filters, q })}
            onOpenFilters={() => setShowFilters(true)}
            onToggleStats={() => setShowStats((v) => !v)}
            onExport={() => exportMembers(members)}
            onManageAgeGroups={() => setShowAgeGroups(true)}
            onManageVillages={() => setShowVillages(true)}
            onManualAdd={() => setShowManualAdd(true)}
            onImport={() => setShowImport(true)}
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
            onShowCurrent={() => go(withStanding("current"))}
            onShowFormer={() => go(withStanding("former"))}
          />

          <FilterChips
            filters={filters}
            year={membership.year}
            resultCount={filtered.length}
            onChange={go}
          />

          {bulk.error && <Notice tone="error">{bulk.error}</Notice>}

          {selectedIds.size > 0 && (
            <BulkActionsBar
              count={selectedIds.size}
              pending={filter === "PENDING"}
              loading={bulk.loading}
              reason={bulkReason}
              age={bulkAge}
              ageGroups={ageGroups}
              onReason={setBulkReason}
              onAge={setBulkAge}
              onClear={clearSelection}
              onApprove={bulk.askApprove}
              onReject={() => bulk.askRefuse(bulkReason)}
              onMoveAge={() => bulk.askMoveToAge(bulkAge)}
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
                if (!awaitsReview(m)) {
                  router.push(memberCardHref(m.id, origin));
                  return;
                }
                setSelected(m);
                setProofZoom(false);
                setShowRejectPicker(false);
              }}
              onRenamed={(id, fullName) => {
                setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, fullName } : m)));
                setSelected((prev) => (prev && prev.id === id ? { ...prev, fullName } : prev));
              }}
              pagination={{ page: currentPage, totalPages, onGo: goToPage }}
            />
          )}
        </>
      )}

      {selected && (
        <MemberDrawer
          member={selected}
          actionLoading={actionLoading}
          showRejectPicker={showRejectPicker}
          rejectReason={rejectReason}
          onClose={closeDrawer}
          onZoomProof={() => setProofZoom(true)}
          onProofSaved={refreshSelected}
          onRejectReason={setRejectReason}
          onOpenRejectPicker={() => setShowRejectPicker(true)}
          onCloseRejectPicker={() => setShowRejectPicker(false)}
          error={reviewError}
          onApprove={() => validate(selected.id, "ACTIVE")}
          onReject={() => validate(selected.id, "REJECTED", rejectReason)}
        />
      )}

      {bulk.asking && (
        <ConfirmDialog
          title={bulk.asking.title}
          message={bulk.asking.message}
          confirmLabel={bulk.asking.confirmLabel}
          danger={bulk.asking.danger}
          loading={bulk.loading}
          onConfirm={bulk.asking.run}
          onClose={bulk.stopAsking}
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
          onChange={go}
          onClose={() => setShowFilters(false)}
        />
      )}

      {proofZoom && selected?.paymentProof && (
        <ProofZoom filename={selected.paymentProof} onClose={() => setProofZoom(false)} />
      )}

      {showManualAdd && (
        <ManualAddDialog
          ageGroups={ageGroups}
          membershipFee={membership.configuredFee}
          payFor={payFor}
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
            setPayFor(null);
          }}
        />
      )}

      {showImport && (
        <MemberImportDialog
          ageGroups={ageGroups}
          onImported={async () => {
            await fetchMembers();
            await bare.refresh();
          }}
          onClose={() => setShowImport(false)}
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
            go({ ...filters, status: "ALL", village: OTHER_VILLAGE });
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
