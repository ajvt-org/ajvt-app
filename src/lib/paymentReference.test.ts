import { describe, it, expect } from "vitest";
import { extractPaymentReference, mentionsKnownMerchant, bankilyStamp } from "./paymentReference";

const RECEIPTS = {
  bankilyEnglish: `Payment Successful !
    Merchant Name : AJVT TAGUILALET
    Merchant Id : 027217
    Amount Paid : MRU 100
    Txn ID: 0426081422303299137
    Date & Time: 14-08-26  22:30:35`,
  bankilyFrench: `Paiement réussi!
    Nom du commerçant: AJVT TAGUILALET
    Identifiant du marchand: 027217
    Montant payé: MRU 100
    Trs ID : 1426081507555334799
    Date et heure: 15-08-26  07:55:55`,
  bankilyArabic: `الدفع الناجح!
    اسم التاجر: AJVT TAGUILALET
    معرف التاجر: 027217
    المبلغ المدفوع: MRU 100
    معرف المعامله : 1026081313152639964
    التاريخ والوقت: 26-08-13  13:15:28`,
  bankilyHistory: `BKL-Paiement Commerçant   Dr 100 MRU
    AJVT TAGUILALET   12-08-26 17:26:22
    Trs id: 1426081217262201792`,
  sedadArabic: `SEDAD BANK
    لقد قمتم بدفع 100,00 أوقية إلى AJVT (AssociationJeunes Village Taguilalett)
    رمز التاجر 08493
    تاريخ الدفع 00:51:34 14-08-2026
    رقم المعاملة TR06242880920`,
  sedadFrench: `Vous avez payé 100,00 MRU à AJVT (AssociationJeunes Village Taguilalett)
    Code commerçant 08493
    Date de paiement 14-08-2026 13:32:37
    ID de la transaction TR06243087690`,
  masrivi: `Paiement facture depuis compte
    100.00 MRU (Montant: 100.00 MRU, frais : 0.00 MRU, taxes : 0.00 MRU)
    payé chez AJV TAGUI 037940 (REF258403935).`,
};

describe("reading the reference off a receipt", () => {
  it("reads Bankily whatever language it is printed in", () => {
    expect(extractPaymentReference(RECEIPTS.bankilyEnglish)).toEqual({
      provider: "bankily",
      reference: "0426081422303299137",
    });
    expect(extractPaymentReference(RECEIPTS.bankilyFrench)?.reference).toBe("1426081507555334799");
    expect(extractPaymentReference(RECEIPTS.bankilyArabic)?.reference).toBe("1026081313152639964");
  });

  it("reads a line torn out of the history, which carries no dialog", () => {
    expect(extractPaymentReference(RECEIPTS.bankilyHistory)?.reference).toBe("1426081217262201792");
  });

  it("reads Sedad, which prefixes its number", () => {
    expect(extractPaymentReference(RECEIPTS.sedadArabic)).toEqual({
      provider: "sedad",
      reference: "TR06242880920",
    });
    expect(extractPaymentReference(RECEIPTS.sedadFrench)?.reference).toBe("TR06243087690");
  });

  it("reads the third provider, where the reference sits inside a sentence", () => {
    expect(extractPaymentReference(RECEIPTS.masrivi)).toEqual({
      provider: "masrivi",
      reference: "REF258403935",
    });
  });

  it("gives every sample a different reference, which is the whole point", () => {
    const found = Object.values(RECEIPTS).map((t) => extractPaymentReference(t)?.reference);
    expect(found.every(Boolean)).toBe(true);
    expect(new Set(found).size).toBe(found.length);
  });

  it("finds nothing in text that is not a receipt", () => {
    expect(extractPaymentReference("صورة شخصية بدون أي أرقام")).toBeNull();
    expect(extractPaymentReference("Merchant Id : 027217 only")).toBeNull();
  });

  it("does not take a short number for a reference", () => {
    expect(extractPaymentReference("027217 100 14-08-26 22:30:35")).toBeNull();
  });

  it("does not take a longer run of digits for one", () => {
    expect(extractPaymentReference("04260814223032991370000")).toBeNull();
  });
});

describe("checking the money reached this association", () => {
  it("recognises each provider's code for it", () => {
    expect(mentionsKnownMerchant(RECEIPTS.bankilyEnglish)).toBe(true);
    expect(mentionsKnownMerchant(RECEIPTS.sedadArabic)).toBe(true);
    expect(mentionsKnownMerchant(RECEIPTS.masrivi)).toBe(true);
  });

  it("does not recognise a payment made to somebody else", () => {
    expect(mentionsKnownMerchant("Merchant Id : 999999 Amount Paid : MRU 100")).toBe(false);
  });
});

describe("the timestamp Bankily hides in its reference", () => {
  it("agrees with the date printed beside it", () => {
    expect(bankilyStamp("0426081422303299137")).toBe("2026-08-14T22:30:32");
    expect(bankilyStamp("1426081507555334799")).toBe("2026-08-15T07:55:53");
    expect(bankilyStamp("1426081217262201792")).toBe("2026-08-12T17:26:22");
  });

  it("says nothing for a reference of another shape", () => {
    expect(bankilyStamp("TR06242880920")).toBeNull();
  });
});
