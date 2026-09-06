"use client";

import { useMemo, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { useToast } from "@/components/Toast";
import DialogHeader from "@/components/DialogHeader";
import IconLabel from "@/components/IconLabel";
import { setupWizard as texts, setupLabels } from "@/lib/texts";
import { dealIntoGroups, swapTeams } from "@/lib/tournamentDraw";
import { groupRoundRobin, groupRoundSizes } from "@/lib/tournamentFixtures";
import { shuffleArray } from "@/lib/tournament";
import { planTournament } from "@/lib/tournamentPlan";
import {
  canLeave,
  isLastStep,
  nextStep,
  previousStep,
  stepsFor,
  wizardBlocker,
  type WizardFormat,
  type WizardState,
  type WizardStep,
  type WizardTeam,
} from "@/lib/tournamentWizard";
import { fromClubWallClock } from "@/lib/clubTime";
import ShapeStep from "./ShapeStep";
import GroupsStep from "./GroupsStep";
import ScheduleStep from "./ScheduleStep";
import BracketStep from "./BracketStep";
import DatesStep from "./DatesStep";

interface SetupWizardProps {
  activityId: string;
  teams: WizardTeam[];
  playedCount: number;
  onDone: () => void;
  onClose: () => void;
}

export default function SetupWizard({
  activityId,
  teams,
  playedCount,
  onDone,
  onClose,
}: SetupWizardProps) {
  const showToast = useToast();
  const blocker = wizardBlocker(teams.length, playedCount);

  const [step, setStep] = useState<WizardStep>("shape");
  const [swapping, setSwapping] = useState<string | null>(null);
  const [venue, setVenue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<WizardState>({
    format: null,
    groupCount: null,
    qualifierCount: null,
    groups: [],
    startsAt: "",
    times: ["16:00", "18:00"],
  });

  const teamsById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const grouped = state.format === "GROUPS_THEN_KNOCKOUT";
  const qualifierCount = grouped ? (state.qualifierCount ?? 0) : teams.length;

  const fixtures = useMemo(
    () =>
      groupRoundRobin(
        state.groups.map((g) => ({ index: g.index, teamIds: g.teams.map((t) => t.id) })),
      ),
    [state.groups],
  );

  const plan = useMemo(() => {
    if (!state.startsAt || state.times.filter(Boolean).length === 0) return null;
    const [y, m, d] = state.startsAt.split("-").map(Number);
    return planTournament({
      startsAt: fromClubWallClock(Date.UTC(y, m - 1, d)),
      times: state.times.filter(Boolean),
      groupRoundSizes: groupRoundSizes(fixtures),
      qualifierCount,
    });
  }, [state.startsAt, state.times, fixtures, qualifierCount]);

  function chooseFormat(format: WizardFormat) {
    setState((p) => ({ ...p, format, groupCount: null, qualifierCount: null, groups: [] }));
  }

  function chooseGroupCount(groupCount: number) {
    setState((p) => ({
      ...p,
      groupCount,
      qualifierCount: null,
      groups: dealIntoGroups(shuffleArray(teams), groupCount),
    }));
  }

  function reshuffle() {
    setSwapping(null);
    setState((p) => ({
      ...p,
      groups: p.groupCount ? dealIntoGroups(shuffleArray(teams), p.groupCount) : p.groups,
    }));
  }

  function pickForSwap(teamId: string) {
    if (swapping === null) {
      setSwapping(teamId);
      return;
    }
    setState((p) => ({ ...p, groups: swapTeams(p.groups, swapping, teamId) }));
    setSwapping(null);
  }

  function goForward() {
    const to = nextStep(step, state, teams);
    if (to) setStep(to);
  }

  function goBack() {
    const to = previousStep(step, state.format);
    if (to) setStep(to);
  }

  async function write() {
    const kickOffs = state.times.filter(Boolean);
    setError("");
    setBusy(true);
    try {
      await api.post(`/api/admin/activities/${activityId}/tournament-setup`, {
        format: state.format,
        groups: grouped
          ? state.groups.map((g) => ({
              name: setupLabels.groupName(g.index),
              teamIds: g.teams.map((t) => t.id),
            }))
          : [],
        qualifierCount: grouped ? qualifierCount : 0,
        startsAt: `${state.startsAt}T${kickOffs[0]}`,
        times: kickOffs,
        venue: venue.trim() || null,
      });
      showToast(texts.done);
      onDone();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const steps = stepsFor(state.format);
  const ready = canLeave(step, state, teams);
  const last = isLastStep(step, state.format);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-t-3xl md:rounded-2xl overflow-y-auto"
        style={{ background: "var(--mint-50)", maxHeight: "92svh", direction: "rtl" }}
      >
        <DialogHeader
          title={texts.title}
          onBack={previousStep(step, state.format) ? goBack : undefined}
          onClose={onClose}
        />
        <div className="p-4 space-y-4">
          {blocker ? (
            <p
              className="p-3 rounded-xl text-sm font-semibold"
              style={{ background: "#fee2e2", color: "#991b1b" }}
            >
              <IconLabel name="warning">{blockerText(blocker)}</IconLabel>
            </p>
          ) : (
            <>
              <p className="text-xs font-bold" style={{ color: "var(--mint-700)" }}>
                {texts.stepOf(steps.indexOf(step) + 1, steps.length)} — {texts.steps[step]}
              </p>

              {step === "shape" && (
                <ShapeStep
                  teamCount={teams.length}
                  format={state.format}
                  groupCount={state.groupCount}
                  qualifierCount={state.qualifierCount}
                  onFormat={chooseFormat}
                  onGroupCount={chooseGroupCount}
                  onQualifierCount={(count) => setState((p) => ({ ...p, qualifierCount: count }))}
                />
              )}
              {step === "groups" && (
                <GroupsStep
                  groups={state.groups}
                  swapping={swapping}
                  onPick={pickForSwap}
                  onReshuffle={reshuffle}
                />
              )}
              {step === "schedule" && <ScheduleStep fixtures={fixtures} teamsById={teamsById} />}
              {step === "bracket" && (
                <BracketStep
                  groupCount={state.groupCount ?? 0}
                  qualifierCount={qualifierCount}
                  grouped={grouped}
                />
              )}
              {step === "dates" && (
                <DatesStep
                  startsAt={state.startsAt}
                  times={state.times}
                  venue={venue}
                  dayCount={plan?.dayCount ?? 0}
                  onStartsAt={(value) => setState((p) => ({ ...p, startsAt: value }))}
                  onTimes={(times) => setState((p) => ({ ...p, times }))}
                  onVenue={setVenue}
                />
              )}

              {error && (
                <p
                  className="p-3 rounded-xl text-sm font-semibold"
                  style={{ background: "#fee2e2", color: "#991b1b" }}
                >
                  <IconLabel name="warning">{error}</IconLabel>
                </p>
              )}

              <div className="flex items-center gap-2">
                {last ? (
                  <button
                    type="button"
                    onClick={write}
                    disabled={!ready || busy}
                    className="btn btn-primary text-sm"
                  >
                    {busy ? texts.writing : <IconLabel name="check">{texts.write}</IconLabel>}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={goForward}
                    disabled={!ready}
                    className="btn btn-primary text-sm"
                  >
                    {texts.next}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function blockerText(blocker: NonNullable<ReturnType<typeof wizardBlocker>>): string {
  if (blocker.kind === "hasResults") return texts.hasResults(blocker.played);
  return texts.tooFewTeams;
}
