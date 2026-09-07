import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TeamBuilder from "./TeamBuilder";
import { ToastProvider } from "./Toast";
import { teamBuilder as texts } from "@/lib/texts";
import type { MyTeamView, MyTeamMember } from "@/lib/myTeamServer";

const VIEWER = "u1";

const person = (
  userId: string,
  fullName: string,
  kind: MyTeamMember["kind"] = "member",
): MyTeamMember => ({ userId, fullName, photo: null, kind });

const view = (over: Partial<MyTeamView> = {}): MyTeamView => ({
  locked: false,
  team: null,
  request: null,
  invitations: [],
  candidates: [],
  squad: { min: 2, max: 3 },
  ...over,
});

const led = (members: MyTeamMember[], captainUserId: string | null = VIEWER) => ({
  id: "t1",
  name: "الصقور",
  captainUserId,
  members,
});

function show(state: MyTeamView, teams: { id: string; name: string }[] = []) {
  const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => state }));
  vi.stubGlobal("fetch", fetchMock);
  const onChanged = vi.fn();
  render(
    <ToastProvider>
      <TeamBuilder activityId="a1" viewerId={VIEWER} teams={teams} onChanged={onChanged} />
    </ToastProvider>,
  );
  return { fetchMock, onChanged };
}

const sent = (fetchMock: ReturnType<typeof vi.fn>, index: number) => {
  const [url, init] = fetchMock.mock.calls[index] as unknown as [string, RequestInit];
  return {
    url,
    method: init.method,
    body: init.body ? JSON.parse(init.body as string) : undefined,
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("a registrant with no team yet", () => {
  it("is asked to name one and offered the teams already there", async () => {
    show(view(), [{ id: "t9", name: "النسور" }]);

    expect(await screen.findByLabelText(new RegExp(texts.createHeading))).toBeDefined();
    expect(screen.getByRole("button", { name: "النسور" })).toBeDefined();
  });

  it("cannot create one without a name", async () => {
    show(view());

    const button = await screen.findByRole("button", { name: new RegExp(texts.create) });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("sends the name it was given", async () => {
    const { fetchMock } = show(view());

    await userEvent.type(await screen.findByLabelText(new RegExp(texts.createHeading)), "الفرسان");
    await userEvent.click(screen.getByRole("button", { name: new RegExp(texts.create) }));

    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1));
    expect(sent(fetchMock, 1)).toMatchObject({
      url: "/api/teams",
      body: { activityId: "a1", name: "الفرسان" },
    });
  });
});

describe("an invitation waiting for an answer", () => {
  it("says which team is asking, with a way to accept and a way to decline", async () => {
    show(view({ invitations: [{ id: "t7", name: "النسور" }] }));

    expect(await screen.findByText(texts.invitedBy("النسور"))).toBeDefined();
    expect(screen.getByLabelText(texts.acceptOf("النسور"))).toBeDefined();
    expect(screen.getByLabelText(texts.declineOf("النسور"))).toBeDefined();
  });

  it("accepts on the team that sent it", async () => {
    const { fetchMock } = show(view({ invitations: [{ id: "t7", name: "النسور" }] }));

    await userEvent.click(await screen.findByLabelText(texts.acceptOf("النسور")));

    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1));
    expect(sent(fetchMock, 1)).toMatchObject({
      url: "/api/teams/t7/invites",
      method: "PATCH",
      body: { accept: true },
    });
  });

  it("declines on the same route", async () => {
    const { fetchMock } = show(view({ invitations: [{ id: "t7", name: "النسور" }] }));

    await userEvent.click(await screen.findByLabelText(texts.declineOf("النسور")));

    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1));
    expect(sent(fetchMock, 1).body).toEqual({ accept: false });
  });

  it("still lets a registrant with an invitation build their own team instead", async () => {
    show(view({ invitations: [{ id: "t7", name: "النسور" }] }));

    expect(await screen.findByLabelText(new RegExp(texts.createHeading))).toBeDefined();
  });
});

describe("a captain reading their own team", () => {
  it("is told it is theirs and that they lead it", async () => {
    show(view({ team: led([person(VIEWER, "محمد ولد أحمد")]) }));

    expect(await screen.findByText("الصقور")).toBeDefined();
    expect(screen.getByText(texts.captain)).toBeDefined();
  });

  it("is told the team is short of the tournament minimum", async () => {
    show(view({ team: led([person(VIEWER, "محمد ولد أحمد")]) }));

    expect(await screen.findByText(texts.incomplete)).toBeDefined();
    expect(screen.getByText(texts.squadNeeds("2-3"))).toBeDefined();
  });

  it("is told nothing is missing once the minimum is reached", async () => {
    show(view({ team: led([person(VIEWER, "محمد"), person("u2", "أحمد")]) }));

    await screen.findByText("الصقور");
    expect(screen.queryByText(texts.incomplete)).toBeNull();
  });

  it("counts an unanswered invitation as nobody, so the team still reads as short", async () => {
    show(view({ team: led([person(VIEWER, "محمد"), person("u2", "أحمد", "invitation")]) }));

    expect(await screen.findByText(texts.incomplete)).toBeDefined();
  });

  it("says which way each waiting row points", async () => {
    show(
      view({
        team: led([
          person(VIEWER, "محمد"),
          person("u2", "أحمد", "invitation"),
          person("u3", "سالم", "request"),
        ]),
      }),
    );

    expect(await screen.findByText(texts.waitingOnInvitation)).toBeDefined();
    expect(screen.getByText(texts.waitingOnRequest)).toBeDefined();
  });

  it("invites a registrant who is on no team", async () => {
    const { fetchMock } = show(
      view({
        team: led([person(VIEWER, "محمد")]),
        candidates: [{ userId: "u5", fullName: "سيدي ولد بابا" }],
      }),
    );

    await userEvent.selectOptions(
      await screen.findByLabelText(new RegExp(texts.inviteHeading)),
      "u5",
    );
    await userEvent.click(screen.getByRole("button", { name: texts.invite }));

    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1));
    expect(sent(fetchMock, 1)).toMatchObject({
      url: "/api/teams/t1/invites",
      method: "POST",
      body: { userId: "u5" },
    });
  });

  it("says so when there is nobody left to invite", async () => {
    show(view({ team: led([person(VIEWER, "محمد")]) }));

    expect(await screen.findByText(texts.noCandidates)).toBeDefined();
  });

  it("stops offering invitations once the team is full", async () => {
    show(
      view({
        team: led([person(VIEWER, "محمد"), person("u2", "أحمد"), person("u3", "سالم")]),
        candidates: [{ userId: "u5", fullName: "سيدي" }],
      }),
    );

    await screen.findByText("الصقور");
    expect(screen.queryByLabelText(new RegExp(texts.inviteHeading))).toBeNull();
  });
});

describe("a captain acting on their own roster", () => {
  it("accepts a request on the members route", async () => {
    const { fetchMock } = show(
      view({ team: led([person(VIEWER, "محمد"), person("u3", "سالم", "request")]) }),
    );

    await userEvent.click(await screen.findByLabelText(texts.acceptPlayer("سالم")));

    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1));
    expect(sent(fetchMock, 1)).toMatchObject({
      url: "/api/teams/t1/members",
      method: "PATCH",
      body: { userId: "u3", accept: true },
    });
  });

  it("declines a request without asking twice", async () => {
    const { fetchMock } = show(
      view({ team: led([person(VIEWER, "محمد"), person("u3", "سالم", "request")]) }),
    );

    await userEvent.click(await screen.findByLabelText(texts.declinePlayer("سالم")));

    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1));
    expect(sent(fetchMock, 1).body).toEqual({ userId: "u3", accept: false });
  });

  it("asks before removing a player", async () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => false),
    );
    const { fetchMock } = show(view({ team: led([person(VIEWER, "محمد"), person("u2", "سالم")]) }));

    await userEvent.click(await screen.findByLabelText(texts.removePlayer("سالم")));

    expect(fetchMock.mock.calls.length).toBe(1);
  });

  it("removes a player once the question is answered", async () => {
    const { fetchMock } = show(view({ team: led([person(VIEWER, "محمد"), person("u2", "سالم")]) }));
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );

    await userEvent.click(await screen.findByLabelText(texts.removePlayer("سالم")));

    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1));
    expect(sent(fetchMock, 1)).toMatchObject({
      url: "/api/teams/t1/members",
      method: "DELETE",
      body: { userId: "u2" },
    });
  });

  it("offers no way to remove themselves", async () => {
    show(view({ team: led([person(VIEWER, "محمد"), person("u2", "سالم")]) }));

    await screen.findByText("الصقور");
    expect(screen.queryByLabelText(texts.removePlayer("محمد"))).toBeNull();
  });

  it("hands the captaincy to another player", async () => {
    const { fetchMock } = show(view({ team: led([person(VIEWER, "محمد"), person("u2", "سالم")]) }));
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );

    await userEvent.click(await screen.findByLabelText(texts.makeCaptain("سالم")));

    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1));
    expect(sent(fetchMock, 1)).toMatchObject({
      url: "/api/teams/t1",
      method: "PATCH",
      body: { captainUserId: "u2" },
    });
  });

  it("offers the captaincy to nobody who has only been invited", async () => {
    show(view({ team: led([person(VIEWER, "محمد"), person("u2", "سالم", "invitation")]) }));

    await screen.findByText("الصقور");
    expect(screen.queryByLabelText(texts.makeCaptain("سالم"))).toBeNull();
  });

  it("disbands the team once the question is answered", async () => {
    const { fetchMock } = show(view({ team: led([person(VIEWER, "محمد")]) }));
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );

    await userEvent.click(await screen.findByRole("button", { name: texts.disband }));

    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1));
    expect(sent(fetchMock, 1)).toMatchObject({ url: "/api/teams/t1", method: "DELETE" });
  });
});

describe("a player in a team somebody else captains", () => {
  it("is offered no way to invite", async () => {
    show(view({ team: led([person("u9", "سالم"), person(VIEWER, "محمد")], "u9") }));

    await screen.findByText("الصقور");
    expect(screen.queryByLabelText(new RegExp(texts.inviteHeading))).toBeNull();
    expect(screen.queryByText(texts.captain)).toBeNull();
  });

  it("is offered no way to remove anybody and no way to disband", async () => {
    show(view({ team: led([person("u9", "سالم"), person(VIEWER, "محمد")], "u9") }));

    await screen.findByText("الصقور");
    expect(screen.queryByLabelText(texts.removePlayer("سالم"))).toBeNull();
    expect(screen.queryByRole("button", { name: texts.disband })).toBeNull();
  });
});

describe("a registrant waiting on a team to answer", () => {
  it("sees which team, that it is waiting, and a way out", async () => {
    show(view({ request: { id: "t7", name: "النسور" } }));

    expect(await screen.findByText(texts.awaitingApproval)).toBeDefined();
    expect(screen.getByRole("button", { name: texts.cancelRequest })).toBeDefined();
  });
});

describe("once the tournament has started", () => {
  const started = (over: Partial<MyTeamView> = {}) => view({ locked: true, ...over });

  it("tells a player their team is settled and offers no way out", async () => {
    show(started({ team: led([person("u9", "سالم"), person(VIEWER, "محمد")], "u9") }));

    expect(await screen.findByText(texts.lockedAtStart)).toBeDefined();
    expect(screen.queryByRole("button", { name: texts.leave })).toBeNull();
  });

  it("takes every control off the captain and leaves the roster readable", async () => {
    show(
      started({
        team: led([person(VIEWER, "محمد"), person("u2", "سالم"), person("u3", "بابا", "request")]),
        candidates: [{ userId: "u5", fullName: "الشيخ" }],
      }),
    );

    expect(await screen.findByText("الصقور")).toBeDefined();
    expect(screen.getByText(texts.captain)).toBeDefined();
    expect(screen.queryByLabelText(new RegExp(texts.inviteHeading))).toBeNull();
    expect(screen.queryByLabelText(texts.acceptPlayer("بابا"))).toBeNull();
    expect(screen.queryByLabelText(texts.removePlayer("سالم"))).toBeNull();
    expect(screen.queryByRole("button", { name: texts.disband })).toBeNull();
  });

  it("offers no way to build a team to somebody who never joined one", async () => {
    show(started());

    expect(await screen.findByText(texts.lockedAtStart)).toBeDefined();
    expect(screen.queryByLabelText(new RegExp(texts.createHeading))).toBeNull();
  });

  it("hides an invitation nobody answered in time", async () => {
    show(started({ invitations: [{ id: "t7", name: "النسور" }] }));

    await screen.findByText(texts.lockedAtStart);
    expect(screen.queryByText(texts.invitedBy("النسور"))).toBeNull();
  });
});

describe("while the tournament has not started", () => {
  it("says a player is free to change team, and offers the way out", async () => {
    show(view({ team: led([person("u9", "سالم"), person(VIEWER, "محمد")], "u9") }));

    expect(await screen.findByText(texts.freeUntilStart)).toBeDefined();
    expect(screen.getByRole("button", { name: texts.leave })).toBeDefined();
  });

  it("offers the captain no way out but the handover and the disband", async () => {
    show(view({ team: led([person(VIEWER, "محمد"), person("u2", "سالم")]) }));

    await screen.findByText("الصقور");
    expect(screen.queryByRole("button", { name: texts.leave })).toBeNull();
    expect(screen.getByRole("button", { name: texts.disband })).toBeDefined();
    expect(screen.getByLabelText(texts.makeCaptain("سالم"))).toBeDefined();
  });

  it("leaves on the join route", async () => {
    const { fetchMock } = show(
      view({ team: led([person("u9", "سالم"), person(VIEWER, "محمد")], "u9") }),
    );
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );

    await userEvent.click(await screen.findByRole("button", { name: texts.leave }));

    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1));
    expect(sent(fetchMock, 1)).toMatchObject({
      url: "/api/teams/t1/join",
      method: "DELETE",
      body: { userId: VIEWER },
    });
  });
});
