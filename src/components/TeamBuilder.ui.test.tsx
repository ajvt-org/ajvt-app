import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TeamBuilder from "./TeamBuilder";
import { ToastProvider } from "./Toast";
import { teamBuilder as texts } from "@/lib/texts";
import type { MyTeamView } from "@/lib/myTeamServer";

const VIEWER = "u1";

const alone = (over: Partial<MyTeamView["team"]> = {}) => ({
  id: "t1",
  name: "الصقور",
  captainUserId: VIEWER,
  members: [
    {
      userId: VIEWER,
      fullName: "محمد ولد أحمد",
      photo: null,
      status: "ACTIVE" as const,
      invitedByCaptain: false,
    },
  ],
  ...over,
});

function mockFetch(view: MyTeamView) {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => view,
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function show(view: MyTeamView, teams: { id: string; name: string }[] = []) {
  const onChanged = vi.fn();
  const fetchMock = mockFetch(view);
  render(
    <ToastProvider>
      <TeamBuilder activityId="a1" viewerId={VIEWER} teams={teams} onChanged={onChanged} />
    </ToastProvider>,
  );
  return { fetchMock, onChanged };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("a registrant with no team yet", () => {
  it("is asked to name one and offered the teams already there", async () => {
    show({ team: null, squad: { min: 2, max: 3 } }, [{ id: "t9", name: "النسور" }]);

    expect(await screen.findByLabelText(new RegExp(texts.createHeading))).toBeDefined();
    expect(screen.getByRole("button", { name: "النسور" })).toBeDefined();
  });

  it("cannot create one without a name", async () => {
    show({ team: null, squad: { min: 2, max: 3 } });

    const button = await screen.findByRole("button", { name: new RegExp(texts.create) });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("sends the name it was given", async () => {
    const { fetchMock } = show({ team: null, squad: { min: 2, max: 3 } });

    await userEvent.type(await screen.findByLabelText(new RegExp(texts.createHeading)), "الفرسان");
    await userEvent.click(screen.getByRole("button", { name: new RegExp(texts.create) }));

    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1));
    const [url, init] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(url).toBe("/api/teams");
    expect(JSON.parse(init.body as string)).toEqual({ activityId: "a1", name: "الفرسان" });
  });

  it("offers no list of teams when the tournament has none", async () => {
    show({ team: null, squad: { min: 2, max: 3 } });

    await screen.findByLabelText(new RegExp(texts.createHeading));
    expect(screen.queryByText(texts.orJoin)).toBeNull();
  });
});

describe("a captain reading their own team", () => {
  it("is told it is theirs and that they lead it", async () => {
    show({ team: alone(), squad: { min: 2, max: 3 } });

    expect(await screen.findByText("الصقور")).toBeDefined();
    expect(screen.getByText(texts.captain)).toBeDefined();
  });

  it("is told the team is short of the tournament minimum", async () => {
    show({ team: alone(), squad: { min: 2, max: 3 } });

    expect(await screen.findByText(texts.incomplete)).toBeDefined();
    expect(screen.getByText(texts.squadNeeds("2-3"))).toBeDefined();
  });

  it("is told nothing is missing once the minimum is reached", async () => {
    const two = alone({
      members: [
        ...alone().members,
        {
          userId: "u2",
          fullName: "أحمد ولد سالم",
          photo: null,
          status: "ACTIVE" as const,
          invitedByCaptain: false,
        },
      ],
    });
    show({ team: two, squad: { min: 2, max: 3 } });

    await screen.findByText("الصقور");
    expect(screen.queryByText(texts.incomplete)).toBeNull();
  });

  it("counts only the players who are in, not the ones still waiting", async () => {
    const withWaiting = alone({
      members: [
        ...alone().members,
        {
          userId: "u2",
          fullName: "أحمد ولد سالم",
          photo: null,
          status: "PENDING" as const,
          invitedByCaptain: false,
        },
      ],
    });
    show({ team: withWaiting, squad: { min: 2, max: 3 } });

    expect(await screen.findByText(texts.incomplete)).toBeDefined();
  });
});

describe("a registrant waiting on a team to answer", () => {
  it("sees which team, that it is waiting, and a way out", async () => {
    const waiting = alone({
      captainUserId: "u9",
      members: [
        {
          userId: VIEWER,
          fullName: "محمد ولد أحمد",
          photo: null,
          status: "PENDING" as const,
          invitedByCaptain: false,
        },
      ],
    });
    show({ team: waiting, squad: { min: 2, max: 3 } });

    expect(await screen.findByText(texts.awaitingApproval)).toBeDefined();
    expect(screen.getByRole("button", { name: texts.cancelRequest })).toBeDefined();
  });
});
