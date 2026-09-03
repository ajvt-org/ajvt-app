import { describe, it, expect } from "vitest";
import {
  attributedDonorName,
  donorNameOnRecord,
  nameAdoptedOnLink,
  publicDonorName,
} from "./donorName";
import { OWNER_ROLE, SUPER_ROLE } from "./adminRoles";
import { PUBLIC_VIEWER } from "./supportPrivacy";

const ANON = "فاعل خير";
const TYPO = "ابو";
const ACCOUNT = "أبوبكر لمرابط";
const CONFIDENTIAL = "الكريم ولد الساتر";

const ADMIN = { role: SUPER_ROLE };
const OWNER = { role: OWNER_ROLE };

const open = (over: Record<string, unknown> = {}) => ({
  donorName: TYPO,
  userId: "u1",
  user: { fullName: ACCOUNT, supportNameConfidential: false },
  ...over,
});

const closed = (over: Record<string, unknown> = {}) => ({
  donorName: CONFIDENTIAL,
  userId: "u2",
  user: { fullName: CONFIDENTIAL, supportNameConfidential: true },
  ...over,
});

describe("donor name resolution", () => {
  it("lets the account name win over the name an admin typed", () => {
    expect(donorNameOnRecord(open(), ADMIN)).toBe(ACCOUNT);
  });

  it("reads the typed name once no account carries one", () => {
    expect(donorNameOnRecord(open({ user: null }), ADMIN)).toBe(TYPO);
  });

  it("falls back to the typed name when nothing is linked", () => {
    expect(donorNameOnRecord({ donorName: "زائر", userId: null, user: null }, ADMIN)).toBe("زائر");
  });

  it("falls back to the typed name when the linked account has none", () => {
    expect(
      donorNameOnRecord(
        open({ donorName: "زائر", user: { fullName: null, supportNameConfidential: false } }),
        ADMIN,
      ),
    ).toBe("زائر");
  });

  it("names a giver it cannot attribute", () => {
    expect(donorNameOnRecord({ donorName: null, userId: null, user: null }, ADMIN)).toBe(ANON);
    expect(donorNameOnRecord({ donorName: "   ", userId: null, user: null }, ADMIN)).toBe(ANON);
  });

  it("has nothing to attribute when neither name is there", () => {
    expect(attributedDonorName({ donorName: null, userId: null, user: null }, ADMIN)).toBeNull();
  });

  it("hides a giver who asked to stay unnamed from the public", () => {
    expect(publicDonorName({ ...open(), anonymous: true }, PUBLIC_VIEWER)).toBe(ANON);
  });

  it("still tells an admin who an unnamed giver is", () => {
    expect(donorNameOnRecord(open(), ADMIN)).toBe(ACCOUNT);
  });

  it("names a giver publicly when they did not ask to be hidden", () => {
    expect(publicDonorName({ ...open(), anonymous: false }, PUBLIC_VIEWER)).toBe(ACCOUNT);
  });
});

describe("the name a link adopts", () => {
  it("is the name on the account being linked", () => {
    expect(nameAdoptedOnLink({ fullName: ACCOUNT })).toBe(ACCOUNT);
    expect(nameAdoptedOnLink({ fullName: ` ${ACCOUNT} ` })).toBe(ACCOUNT);
  });

  it("is nothing when the account carries no name", () => {
    expect(nameAdoptedOnLink({ fullName: null })).toBeNull();
    expect(nameAdoptedOnLink({ fullName: "   " })).toBeNull();
  });

  it("is nothing when there is no account", () => {
    expect(nameAdoptedOnLink(null)).toBeNull();
    expect(nameAdoptedOnLink(undefined)).toBeNull();
  });
});

describe("a donor whose name is confidential", () => {
  it("gives an ordinary admin nothing to attribute", () => {
    expect(attributedDonorName(closed(), ADMIN)).toBeNull();
    expect(donorNameOnRecord(closed(), ADMIN)).toBe(ANON);
  });

  it("withholds the name from the public", () => {
    expect(publicDonorName({ ...closed(), anonymous: false }, PUBLIC_VIEWER)).toBe(ANON);
  });

  it("gives the name to the role that holds the promise", () => {
    expect(donorNameOnRecord(closed(), OWNER)).toBe(CONFIDENTIAL);
  });

  it("gives him his own name", () => {
    expect(donorNameOnRecord(closed(), { userId: "u2" })).toBe(CONFIDENTIAL);
  });
});
