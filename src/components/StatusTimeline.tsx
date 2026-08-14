import { formatDate } from "@/lib/utils";
import Icon from "@/components/Icon";

type Status = "PENDING" | "ACTIVE" | "REJECTED";

interface StatusTimelineProps {
  status: Status;
  createdAt: string;
  updatedAt: string;
}

// There's no per-transition history table — only the current status plus
// createdAt/updatedAt. "Under review" therefore has no date of its own (it
// starts the instant the request is received); the decision step's date is
// only meaningful once the status has actually moved past PENDING, since
// updatedAt also changes on unrelated edits (e.g. a photo update) while
// still pending.
export default function StatusTimeline({ status, createdAt, updatedAt }: StatusTimelineProps) {
  const decided = status !== "PENDING";
  const decisionLabel =
    status === "REJECTED" ? "تم الرفض" : status === "ACTIVE" ? "تم القبول" : "القرار النهائي";

  const steps = [
    { label: "استُلم الطلب", done: true, current: false, date: createdAt },
    { label: "قيد المراجعة", done: decided, current: !decided, date: null },
    { label: decisionLabel, done: decided, current: false, date: decided ? updatedAt : null },
  ];

  return (
    <div className="card p-4">
      <p className="text-xs font-bold mb-3" style={{ color: "var(--text-muted)" }}>
        مراحل الطلب
      </p>
      <div className="space-y-0">
        {steps.map((step, i) => (
          <div key={step.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                style={{
                  background: step.done
                    ? "var(--mint-600)"
                    : step.current
                      ? "var(--copper-400)"
                      : "var(--mint-100)",
                  color: step.done || step.current ? "white" : "var(--mint-400)",
                }}
              >
                {step.done ? <Icon name="check" size={13} /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div
                  className="w-0.5 flex-1"
                  style={{
                    minHeight: "1.5rem",
                    background: step.done ? "var(--mint-600)" : "var(--mint-100)",
                  }}
                />
              )}
            </div>
            <div className="pb-4">
              <p
                className="text-sm font-bold"
                style={{
                  color: step.done || step.current ? "var(--text-main)" : "var(--text-muted)",
                }}
              >
                {step.label}
                {step.current && (
                  <span className="pulse" style={{ display: "inline-block", marginRight: "0.4em" }}>
                    ●
                  </span>
                )}
              </p>
              {step.date && (
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {formatDate(step.date)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
