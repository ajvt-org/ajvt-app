import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import FollowTeamButton from "./FollowTeamButton";
import { publicTournament as texts } from "@/lib/texts";

const showToast = vi.fn();

vi.mock("@/components/Toast", () => ({ useToast: () => showToast }));

const words = texts.entrant.team;

function answerState(following: boolean) {
  return { ok: true, json: async () => ({ loggedIn: true, following }) };
}

let pending: ((value: unknown) => void) | null = null;

function heldRequest() {
  return new Promise((resolve) => {
    pending = resolve;
  });
}

async function open(following = false) {
  const fetchMock = vi.fn().mockResolvedValueOnce(answerState(following));
  vi.stubGlobal("fetch", fetchMock);
  render(<FollowTeamButton teamId="t1" />);
  await screen.findByRole("button");
  return fetchMock;
}

const star = () => screen.getByRole("button");
const disc = () => star().querySelector("span") as HTMLElement;

beforeEach(() => {
  showToast.mockReset();
  pending = null;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("the follow star", () => {
  it("fills on the tap rather than on the answer", async () => {
    const fetchMock = await open(false);
    fetchMock.mockImplementationOnce(() => heldRequest());

    expect(star().getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(star());

    await waitFor(() => expect(star().getAttribute("aria-pressed")).toBe("true"));
    expect(showToast).not.toHaveBeenCalled();
    pending?.({ ok: true });
  });

  it("says so once the request lands", async () => {
    const fetchMock = await open(false);
    fetchMock.mockResolvedValueOnce({ ok: true });
    fireEvent.click(star());

    await waitFor(() => expect(showToast).toHaveBeenCalledWith(words.followed));
    expect(star().getAttribute("aria-pressed")).toBe("true");
  });

  it("empties the star again when the request is refused", async () => {
    const fetchMock = await open(false);
    fetchMock.mockResolvedValueOnce({ ok: false });
    fireEvent.click(star());

    await waitFor(() => expect(star().getAttribute("aria-pressed")).toBe("false"));
    expect(showToast).toHaveBeenCalledWith(texts.followFailed, "error");
  });

  it("says something when the network never answers", async () => {
    const fetchMock = await open(false);
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    fireEvent.click(star());

    await waitFor(() => expect(showToast).toHaveBeenCalledWith(texts.followFailed, "error"));
    expect(star().getAttribute("aria-pressed")).toBe("false");
  });

  it("empties on the tap when a followed team is dropped", async () => {
    const fetchMock = await open(true);
    fetchMock.mockImplementationOnce(() => heldRequest());
    fireEvent.click(star());

    await waitFor(() => expect(star().getAttribute("aria-pressed")).toBe("false"));
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "DELETE" });
    pending?.({ ok: true });
  });

  it("carries the pressed state on a filled disc rather than on the glyph", async () => {
    await open(true);

    expect(disc().style.background).toContain("--mint-600");
    expect(disc().className).toContain("rounded-full");
  });

  it("leaves the disc empty while nothing is followed", async () => {
    await open(false);

    expect(disc().style.background).toBe("transparent");
    expect(disc().className).toContain("rounded-full");
  });

  it("draws the same disc and the same glyph in both states", async () => {
    const fetchMock = await open(false);
    const empty = {
      disc: disc().style.width,
      glyph: star().querySelector("svg")?.getAttribute("width"),
    };

    fetchMock.mockResolvedValueOnce({ ok: true });
    fireEvent.click(star());
    await waitFor(() => expect(star().getAttribute("aria-pressed")).toBe("true"));

    expect(disc().style.width).toBe(empty.disc);
    expect(disc().style.height).toBe(empty.disc);
    expect(star().querySelector("svg")?.getAttribute("width")).toBe(empty.glyph);
  });

  it("takes no second tap while the first is in the air", async () => {
    const fetchMock = await open(false);
    fetchMock.mockImplementationOnce(() => heldRequest());
    fireEvent.click(star());

    await waitFor(() => expect(star()).toHaveProperty("disabled", true));
    fireEvent.click(star());

    expect(fetchMock).toHaveBeenCalledTimes(2);
    pending?.({ ok: true });
  });
});
