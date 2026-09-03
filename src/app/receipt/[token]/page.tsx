import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { prisma } from "@/lib/prisma";
import { amountInWords } from "@/lib/arabicAmount";
import Money from "@/components/Money";
import { receiptDate } from "@/lib/officialReceipt";
import { receiptSheet, receiptVerify } from "@/lib/texts/receipt";

export const dynamic = "force-dynamic";

function Row({ label, value, dir }: { label: string; value: React.ReactNode; dir?: string }) {
  return (
    <div
      className="flex items-center justify-between gap-4 py-3"
      style={{ borderBottom: "1px solid var(--mint-100)" }}
    >
      <dt className="text-sm" style={{ color: "var(--text-muted)" }}>
        {label}
      </dt>
      <dd className="text-sm font-bold" style={{ color: "var(--text-main)" }} dir={dir}>
        {value}
      </dd>
    </div>
  );
}

function HomeLink() {
  return (
    <Link href="/" className="btn btn-ghost">
      <IconLabel name="home">{receiptVerify.home}</IconLabel>
    </Link>
  );
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className="verify-refused"
      role="img"
      aria-label={label}
      style={ok ? { background: "#d1fae5" } : undefined}
    >
      <Icon name={ok ? "check" : "ban"} size={34} color={ok ? "#065f46" : "#991b1b"} />
    </span>
  );
}

export default async function ReceiptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const receipt = await prisma.receipt.findUnique({ where: { token } });
  const valid = receipt?.status === "ACTIVE";

  return (
    <div className="app-shell">
      <PageHeader title={receiptVerify.title} />

      {valid ? (
        <>
          <div className="verify-hero">
            <Badge ok label={receiptVerify.valid} />
            <h2 className="font-black text-xl text-white">{receiptVerify.valid}</h2>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
              {receiptSheet.org}
            </p>
          </div>

          <dl className="flex-1 px-5 py-5 space-y-0">
            <Row label={receiptVerify.numberLabel} value={receipt.number} dir="ltr" />
            <Row label={receiptVerify.payerLabel} value={receipt.payerName} />
            <Row label={receiptVerify.reasonLabel} value={receipt.reason} />
            <Row label={receiptVerify.amountLabel} value={<Money value={receipt.amount} />} />
            <Row label={receiptVerify.wordsLabel} value={amountInWords(receipt.amount)} />
            <Row label={receiptVerify.dateLabel} value={receiptDate(receipt.issuedOn)} />
          </dl>

          <div className="px-5 pb-8">
            <HomeLink />
          </div>
        </>
      ) : (
        <div className="flex-1 px-5 py-12 text-center space-y-3">
          <Badge ok={false} label={receipt ? receiptVerify.voided : receiptVerify.unknown} />
          <h2 className="font-black text-lg" style={{ color: "var(--text-main)" }}>
            {receipt ? receiptVerify.voided : receiptVerify.unknown}
          </h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {receipt ? receiptVerify.voidedHint : receiptVerify.unknownHint}
          </p>

          {receipt && (
            <dl className="text-right pt-2">
              <Row label={receiptVerify.numberLabel} value={receipt.number} dir="ltr" />
              {receipt.voidedAt && (
                <Row label={receiptVerify.voidedAtLabel} value={receiptDate(receipt.voidedAt)} />
              )}
            </dl>
          )}

          <div className="pt-3">
            <HomeLink />
          </div>
        </div>
      )}
    </div>
  );
}
