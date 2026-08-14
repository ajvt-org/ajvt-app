import Icon, { type IconName } from "./Icon";

// An emoji carries its own colours, so a monochrome one like ➕ or 🔑 turns
// invisible the moment it sits on a coloured button. An Icon inherits
// currentColor and always contrasts with the label it stands next to.
export default function IconLabel({
  name,
  children,
  size = 15,
}: {
  name: IconName;
  children: React.ReactNode;
  size?: number;
}) {
  return (
    <span className="inline-flex items-center justify-center gap-1.5">
      <Icon name={name} size={size} />
      {children}
    </span>
  );
}
