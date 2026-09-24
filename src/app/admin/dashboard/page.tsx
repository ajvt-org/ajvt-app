"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { REJECTION_REASONS } from "@/lib/rejectionReasons";
import {
  MEMBER_FILTER_KEYS,
  readFilters,
  writeFilters,
  matchesFilters,
  membershipYearsPresent,
  upToDate,
  activeFilterCount,
  NO_FILTERS,
} from "@/lib/memberFilters";
import { memberCardHref } from "@/lib/adminBackLink";
import { awaitsReview } from "@/lib/reviewQueue";
import { pageCount, paginate } from "@/lib/listUrlState";
import { OTHER_VILLAGE } from "@/lib/villages";
import { useAdminListUrlState } from "@/hooks/useAdminListUrlState";
import PageLoading from "@/components/PageLoading";
import ConfirmDialog from "@/components/ConfirmDialog";
import Notice from "@/components/Notice";
import { useAdminOrigin } from "@/components/admin/adminOrigin";
import { useMembershipSettings } from "@/components/admin/useMembershipSettings";
import type { FilterTab } from "./types";
import { PAGE_SIZE } from "./constants";
import { initialFilterTab } from "./initialTab";
import { exportMembers } from "./exportMembers";
import { statusCounts } from "./memberStats";
import StatTabs from "./StatTabs";
import MemberSearch from "./MemberSearch";
import FilterSheet from "./FilterSheet";
import FilterChips from "./FilterChips";
import MembersFilterRow from "./MembersFilterRow";
import UpToDateSummary from "./UpToDateSummary";
import MemberStats from "./MemberStats";
import BulkActionsBar from "./BulkActionsBar";
import MemberList from "./MemberList";
import BareAccountsSection from "./BareAccountsSection";
import MemberReview from "./MemberReview";
import DashboardDialogs, { useDashboardDialogs } from "./DashboardDialogs";
import { useBareAccounts } from "./useBareAccounts";
import { useBulkActions } from "./useBulkActions";
import { useMembersData } from "./useMembersData";
import { useDashboardLists } from "./useDashboardLists";
import { useMemberReview } from "./useMemberReview";
import { useSelection } from "./useSelection";

function AdminDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const origin = useAdminOrigin();
  const membership = useMembershipSettings();
  const { filters, page, go, goToPage } = useAdminListUrlState("/admin/dashboard", {
    keys: [...MEMBER_FILTER_KEYS],
    readFilters,
    writeFilters,
  });
  const filter = filters.status as FilterTab;
  const setFilter = (status: FilterTab) => go({ ...filters, status });

  const data = useMembersData((loaded) => {
    if (!searchParams.get("status")) setFilter(initialFilterTab(loaded));
  });
  const { members, recordingAdmins } = data;
  const lists = useDashboardLists();
  const bare = useBareAccounts();
  const dialogs = useDashboardDialogs();
  const selection = useSelection();

  const [bulkReason, setBulkReason] = useState<string>(REJECTION_REASONS[0]);
  const [bulkAge, setBulkAge] = useState("");
  const bulk = useBulkActions({
    selectedIds: selection.ids,
    onCleared: () => {
      selection.clear();
      setBulkAge("");
    },
    onDone: () => data.reload(),
  });

  const [showStats, setShowStats] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

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
  const totalPages = pageCount(filtered.length, PAGE_SIZE);
  const currentPage = Math.min(page, totalPages);
  const paginated = paginate(filtered, currentPage, PAGE_SIZE);

  const review = useMemberReview({
    paginated,
    reload: data.reload,
    reloadQuietly: data.reloadQuietly,
  });

  const peopleAdded = async () => {
    await data.reload();
    await bare.refresh();
  };

  return (
    <div className="admin-page">
      <StatTabs
        active={filter}
        counts={{ ...statusCounts(members), NO_REQUEST: bare.users.length }}
        onPick={setFilter}
      />

      {filter === "NO_REQUEST" ? (
        <BareAccountsSection
          users={bare.users}
          loading={bare.loading}
          onFill={dialogs.fill}
          onChanged={bare.refresh}
        />
      ) : (
        <>
          <MemberSearch
            value={filters.q}
            filterCount={activeFilterCount(filters)}
            statsOpen={showStats}
            onChange={(q) => go({ ...filters, q })}
            onOpenFilters={() => setShowFilters(true)}
            onToggleStats={() => setShowStats((v) => !v)}
            onExport={() => exportMembers(members)}
            onManageAgeGroups={() => dialogs.show("ageGroups")}
            onManageVillages={() => dialogs.show("villages")}
            onManualAdd={() => dialogs.show("manualAdd")}
            onImport={() => dialogs.show("import")}
          />

          <MembersFilterRow
            filters={filters}
            villages={lists.villages}
            ageGroups={lists.ageGroups}
            paymentMethods={paymentMethods}
            onChange={go}
          />

          {showStats && <MemberStats members={members} />}

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
            recordingAdmins={recordingAdmins}
            resultCount={filtered.length}
            onChange={go}
          />

          {bulk.error && <Notice tone="error">{bulk.error}</Notice>}

          {selection.ids.size > 0 && (
            <BulkActionsBar
              count={selection.ids.size}
              pending={filter === "PENDING"}
              loading={bulk.loading}
              reason={bulkReason}
              age={bulkAge}
              ageGroups={lists.ageGroups}
              onReason={setBulkReason}
              onAge={setBulkAge}
              onClear={selection.clear}
              onApprove={bulk.askApprove}
              onReject={() => bulk.askRefuse(bulkReason)}
              onMoveAge={() => bulk.askMoveToAge(bulkAge)}
            />
          )}

          {data.loading ? (
            <PageLoading />
          ) : (
            <MemberList
              members={paginated}
              selectedIds={selection.ids}
              onToggle={selection.toggle}
              onOpen={(m) => {
                if (awaitsReview(m)) review.open(m);
                else router.push(memberCardHref(m.id, origin));
              }}
              onRenamed={(id, fullName) => {
                data.setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, fullName } : m)));
                review.rename(id, fullName);
              }}
              pagination={{ page: currentPage, totalPages, onGo: goToPage }}
            />
          )}
        </>
      )}

      <MemberReview review={review} />

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
          ageGroups={lists.ageGroups}
          villages={lists.villages}
          paymentMethods={paymentMethods}
          recordingAdmins={recordingAdmins}
          years={years}
          year={membership.year}
          resultCount={filtered.length}
          onChange={go}
          onClose={() => setShowFilters(false)}
        />
      )}

      <DashboardDialogs
        dialogs={dialogs}
        lists={lists}
        membershipFee={membership.configuredFee}
        onPeopleAdded={peopleAdded}
        onMembersChanged={() => data.reload()}
        onShowOtherVillage={() => go({ ...filters, status: "ALL", village: [OTHER_VILLAGE] })}
      />
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
