"use client";

import DestinationSelect from "@/components/admin/DestinationSelect";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import Money from "@/components/Money";
import { destinationPicker, expenseDestinations as texts } from "@/lib/texts";
import { evenSplit } from "@/lib/expenseSplit";
import type { DestinationOption } from "@/lib/moneyDestination";
import type { ExpenseShare } from "./types";

function spread(shares: ExpenseShare[], total: number): ExpenseShare[] {
  const amounts = evenSplit(total, shares.length);
  return shares.map((share, at) => ({ ...share, amount: String(amounts[at] ?? 0) }));
}

export default function ExpenseDestinationsField({
  shares,
  destinations,
  total,
  onChange,
}: {
  shares: ExpenseShare[];
  destinations: DestinationOption[];
  total: number;
  onChange: (shares: ExpenseShare[]) => void;
}) {
  const many = shares.length > 1;
  const allocated = shares.reduce((sum, share) => sum + (Number(share.amount) || 0), 0);
  const difference = allocated - total;

  function patch(at: number, change: Partial<ExpenseShare>) {
    onChange(shares.map((share, i) => (i === at ? { ...share, ...change } : share)));
  }

  function add() {
    onChange(spread([...shares, { destinationId: "", amount: "" }], total));
  }

  function remove(at: number) {
    const left = shares.filter((_, i) => i !== at);
    onChange(left.length > 1 ? left : [{ ...left[0], amount: "" }]);
  }

  return (
    <div>
      <p className="block text-sm font-bold mb-1.5" style={{ color: "var(--text-main)" }}>
        {many ? texts.headingMany : texts.heading}
      </p>

      <div className="space-y-2">
        {shares.map((share, at) => (
          <div key={at} className="flex items-center gap-2">
            <DestinationSelect
              id={at === 0 ? "expense-activity" : undefined}
              destinations={destinations}
              value={share.destinationId}
              onChange={(destinationId) => patch(at, { destinationId })}
              emptyLabel={destinationPicker.noDestination}
              className="input flex-1 min-w-0"
            />
            {many && (
              <>
                <input
                  type="number"
                  dir="ltr"
                  min={1}
                  value={share.amount}
                  onChange={(e) => patch(at, { amount: e.target.value })}
                  aria-label={texts.amountLabel(at + 1)}
                  className="input"
                  style={{ width: "6.5rem" }}
                />
                <button
                  type="button"
                  onClick={() => remove(at)}
                  className="btn-icon shrink-0"
                  aria-label={texts.remove(at + 1)}
                  style={{ color: "#991b1b" }}
                >
                  <Icon name="close" size={14} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {many && (
        <p className="text-xs font-semibold mt-2" style={{ color: "var(--text-muted)" }}>
          {texts.total} <Money value={allocated} />{" "}
          <span style={{ color: difference === 0 ? "var(--mint-700)" : "#991b1b" }}>
            {difference === 0
              ? texts.matches
              : difference < 0
                ? texts.short(-difference)
                : texts.over(difference)}
          </span>
        </p>
      )}

      <button type="button" onClick={add} className="btn btn-sm btn-ghost mt-2">
        <IconLabel name="plus">{texts.add}</IconLabel>
      </button>
    </div>
  );
}
