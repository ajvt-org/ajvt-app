import Icon, { type IconName } from "./Icon";

// An emoji carries its own colours, so a monochrome one like ➕ or 🔑 turns
// invisible the moment it sits on a coloured button. An Icon inherits
// currentColor and always contrasts with the label it stands next to.
// The size is in em so it tracks the label instead of shrinking against it
// on a large button and swamping it on a small one.
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
