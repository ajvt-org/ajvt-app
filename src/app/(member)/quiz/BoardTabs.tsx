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
    <div className="card p-1.5 flex gap-1" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={tab.id === open}
          onClick={() => onSelect(tab.id)}
          className="flex-1 min-w-0 truncate rounded-2xl text-xs py-2.5 px-2 transition-all"
          style={
            tab.id === open
              ? {
                  background: "linear-gradient(135deg, var(--mint-600), var(--mint-700))",
                  color: "white",
                  fontWeight: 800,
                }
              : { background: "transparent", color: "var(--text-muted)", fontWeight: 700 }
          }
        >
          {tab.title}
        </button>
      ))}
    </div>
  );
}
