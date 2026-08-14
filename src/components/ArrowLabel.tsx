import Icon from "./Icon";

// Arabic reads right to left, so moving forward points left and going back
// points right. Keeping that decision here means the arrows stay consistent,
// and a second language would only have to change this file.
export default function ArrowLabel({
  children,
  direction = "forward",
}: {
  children: React.ReactNode;
  direction?: "forward" | "back";
}) {
  return (
    <span className="inline-flex items-center justify-center gap-1.5">
      {direction === "back" && <Icon name="chevronRight" size={14} />}
      {children}
      {direction === "forward" && <Icon name="chevronLeft" size={14} />}
    </span>
  );
}
