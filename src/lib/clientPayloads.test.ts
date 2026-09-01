import { describe, it, expect } from "vitest";
import type { DaysPayload } from "@/components/admin/tournament/daysTypes";
import type { Match } from "@/components/admin/tournament/types";
import type { PublicMatch } from "@/components/tournament/publicTypes";
import type { HomeSummary } from "@/app/admin/AdminHome";
import type { ActivityPageData } from "@/app/(member)/activities/[id]/activityQuery";
import type { listDays } from "./tournamentDaysServer";
import type { listMatches } from "./adminMatchesServer";
import type { adminHomeSummary } from "./adminHomeServer";

type OverTheWire<T> = T extends Date
  ? string
  : T extends (infer U)[]
    ? OverTheWire<U>[]
    : T extends object
      ? { [K in keyof T]: OverTheWire<T[K]> }
      : T;

type Served<T extends (...args: never[]) => unknown> = OverTheWire<Awaited<ReturnType<T>>>;

type Mismatch<Payload, Client> = {
  payloadDoesNotFitTheClientType: true;
  payload: Payload;
  client: Client;
};

type Feeds<Payload, Client> = [Payload] extends [Client] ? true : Mismatch<Payload, Client>;

const daysTabReadsWhatTheDaysRouteSends: Feeds<Served<typeof listDays>, DaysPayload> = true;

const matchesTabReadsWhatTheMatchesRouteSends: Feeds<
  Served<typeof listMatches>,
  { matches: Match[]; mvpVoteMinutes: number }
> = true;

const adminHomeReadsWhatTheHomeRouteSends: Feeds<
  Served<typeof adminHomeSummary>,
  HomeSummary
> = true;

const publicPageReadsWhatItsQuerySelects: Feeds<ActivityPageData["matches"], PublicMatch[]> = true;

describe("the client types answer to the routes that feed them", () => {
  it("holds every payload against the type its screen reads", () => {
    expect([
      daysTabReadsWhatTheDaysRouteSends,
      matchesTabReadsWhatTheMatchesRouteSends,
      adminHomeReadsWhatTheHomeRouteSends,
      publicPageReadsWhatItsQuerySelects,
    ]).toEqual([true, true, true, true]);
  });
});
