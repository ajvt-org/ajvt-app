import Icon, { type IconName } from "./Icon";

export default function IconLabel({
  name,
  children,
  size = "1.3em",
  filled,
  color,
}: {
  name: IconName;
  children: React.ReactNode;
  size?: number | string;
  filled?: boolean;
  color?: string;
}) {
  return (
    <span className="icon-label inline-flex items-center justify-center gap-1.5">
      <Icon name={name} size={size} className="icon-inline" filled={filled} color={color} />
      {children}
    </span>
  );
}
