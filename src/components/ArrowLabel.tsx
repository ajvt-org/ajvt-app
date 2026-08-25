import Icon from "./Icon";

export default function ArrowLabel({
  children,
  direction = "forward",
}: {
  children: React.ReactNode;
  direction?: "forward" | "back";
}) {
  return (
    <span className="arrow-label inline-flex items-center justify-center gap-1.5">
      {direction === "back" && <Icon name="chevronRight" size={14} />}
      {children}
      {direction === "forward" && <Icon name="chevronLeft" size={14} />}
    </span>
  );
}
