"use client";

export interface QuizTab {
  id: string;
  title: string;
}

export default function BoardTabs({
  tabs,
  active,
  onSelect,
}: {
  tabs: QuizTab[];
  active: string | null;
  onSelect: (id: string) => void;
}) {
  if (tabs.length < 2) return null;
  const open = tabs.some((t) => t.id === active) ? active : tabs[0]?.id;

  return (
    <div className="flex gap-2 overflow-x-auto" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={tab.id === open}
          onClick={() => onSelect(tab.id)}
          className="btn btn-sm text-xs font-bold shrink-0"
          style={
            tab.id === open
              ? { background: "var(--mint-600)", color: "white" }
              : { background: "white", color: "var(--text-main)" }
          }
        >
          {tab.title}
        </button>
      ))}
    </div>
  );
}
