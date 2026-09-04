import { describe, it, expect } from "vitest";
import { extractPaymentReference, mentionsKnownMerchant, bankilyStamp } from "./paymentReference";

const KNOWN = ["111111", "22222", "333333"];

const RECEIPTS = {
  bankilyEnglish: `Payment Successful !
    Merchant Name : AJVT TAGUILALET
    Merchant Id : 111111
    Amount Paid : MRU 100
    Txn ID: 7026081422303210001
    Date & Time: 14-08-26  22:30:35`,
  bankilyFrench: `Paiement réussi!
    Nom du commerçant: AJVT TAGUILALET
    Identifiant du marchand: 111111
    Montant payé: MRU 100
    Trs ID : 7126081507555310002
    Date et heure: 15-08-26  07:55:55`,
  bankilyArabic: `الدفع الناجح!
    اسم التاجر: AJVT TAGUILALET
    معرف التاجر: 111111
    المبلغ المدفوع: MRU 100
    معرف المعامله : 7226081313152610003
    التاريخ والوقت: 26-08-13  13:15:28`,
  bankilyHistory: `BKL-Paiement Commerçant   Dr 100 MRU
    AJVT TAGUILALET   12-08-26 17:26:22
    Trs id: 7326081217262210004`,
  sedadArabic: `SEDAD BANK
    لقد قمتم بدفع 100,00 أوقية إلى AJVT (AssociationJeunes Village Taguilalett)
    رمز التاجر 22222
    تاريخ الدفع 00:51:34 14-08-2026
    رقم المعاملة TR10000000001`,
  sedadFrench: `Vous avez payé 100,00 MRU à AJVT (AssociationJeunes Village Taguilalett)
    Code commerçant 22222
    Date de paiement 14-08-2026 13:32:37
    ID de la transaction TR10000000002`,
  masrivi: `Paiement facture depuis compte
    100.00 MRU (Montant: 100.00 MRU, frais : 0.00 MRU, taxes : 0.00 MRU)
    payé chez AJV TAGUI 333333 (REF100000001).`,
};

describe("reading the reference off a receipt", () => {
  it("reads Bankily whatever language it is printed in", () => {
    expect(extractPaymentReference(RECEIPTS.bankilyEnglish)).toEqual({
      provider: "bankily",
      reference: "7026081422303210001",
    });
    expect(extractPaymentReference(RECEIPTS.bankilyFrench)?.reference).toBe("7126081507555310002");
    expect(extractPaymentReference(RECEIPTS.bankilyArabic)?.reference).toBe("7226081313152610003");
  });

  it("reads a line torn out of the history, which carries no dialog", () => {
    expect(extractPaymentReference(RECEIPTS.bankilyHistory)?.reference).toBe("7326081217262210004");
  });

  it("reads Sedad, which prefixes its number", () => {
    expect(extractPaymentReference(RECEIPTS.sedadArabic)).toEqual({
      provider: "sedad",
      reference: "TR10000000001",
    });
    expect(extractPaymentReference(RECEIPTS.sedadFrench)?.reference).toBe("TR10000000002");
  });

  it("reads the third provider, where the reference sits inside a sentence", () => {
    expect(extractPaymentReference(RECEIPTS.masrivi)).toEqual({
      provider: "masrivi",
      reference: "REF100000001",
    });
  });

  it("gives every sample a different reference, which is the whole point", () => {
    const found = Object.values(RECEIPTS).map((t) => extractPaymentReference(t)?.reference);
    expect(found.every(Boolean)).toBe(true);
    expect(new Set(found).size).toBe(found.length);
  });

  it("finds nothing in text that is not a receipt", () => {
    expect(extractPaymentReference("صورة شخصية بدون أي أرقام")).toBeNull();
    expect(extractPaymentReference("Merchant Id : 111111 only")).toBeNull();
  });

  it("does not take a short number for a reference", () => {
    expect(extractPaymentReference("111111 100 14-08-26 22:30:35")).toBeNull();
  });

  it("does not take a longer run of digits for one", () => {
    expect(extractPaymentReference("70260814223032100010000")).toBeNull();
  });
});

describe("checking the money reached this association", () => {
  it("recognises each provider's code for it", () => {
    expect(mentionsKnownMerchant(RECEIPTS.bankilyEnglish, KNOWN)).toBe(true);
    expect(mentionsKnownMerchant(RECEIPTS.sedadArabic, KNOWN)).toBe(true);
    expect(mentionsKnownMerchant(RECEIPTS.masrivi, KNOWN)).toBe(true);
  });

  it("recognises nothing when no account has a code to look for", () => {
    expect(mentionsKnownMerchant(RECEIPTS.bankilyEnglish, [])).toBe(false);
  });

  it("does not recognise a payment made to somebody else", () => {
    expect(mentionsKnownMerchant("Merchant Id : 999999 Amount Paid : MRU 100", KNOWN)).toBe(false);
  });
});

describe("the timestamp Bankily hides in its reference", () => {
  it("agrees with the date printed beside it", () => {
    expect(bankilyStamp("7026081422303210001")).toBe("2026-08-14T22:30:32");
    expect(bankilyStamp("7126081507555310002")).toBe("2026-08-15T07:55:53");
    expect(bankilyStamp("7326081217262210004")).toBe("2026-08-12T17:26:22");
  });

  it("says nothing for a reference of another shape", () => {
    expect(bankilyStamp("TR10000000001")).toBeNull();
  });
});
