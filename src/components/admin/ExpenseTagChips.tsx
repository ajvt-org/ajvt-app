export type ExpenseTag = { id: string; name: string };

// One shape for a tag wherever it appears: on an expense, in the picker, in
// the filter row. `onClick` turns it into a control; without it, it is a label.
export default function ExpenseTagChips({
  tags,
  selected,
  onToggle,
  empty,
}: {
  tags: ExpenseTag[];
  selected?: string[];
  onToggle?: (id: string) => void;
  empty?: string;
}) {
  if (tags.length === 0) {
    return empty ? (
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {empty}
      </p>
    ) : null;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const on = selected ? selected.includes(tag.id) : true;
        const style = {
          background: on ? "var(--mint-600)" : "var(--mint-100)",
          color: on ? "white" : "var(--mint-700)",
        };
        if (!onToggle) {
          return (
            <span key={tag.id} className="expense-tag" style={style}>
              {tag.name}
            </span>
          );
        }
        return (
          <button
            key={tag.id}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(tag.id)}
            className="expense-tag"
            style={style}
          >
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}
