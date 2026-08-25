import Icon, { type IconName } from "./Icon";

export default function IconLabel({
  name,
  children,
  size = "1.3em",
  filled,
  color,
  after,
}: {
  name: IconName;
  children: React.ReactNode;
  size?: number | string;
  filled?: boolean;
  color?: string;
  after?: boolean;
}) {
  const icon = <Icon name={name} size={size} filled={filled} color={color} />;
  return (
    <span className="icon-label inline-flex items-center justify-center gap-1.5">
      {after ? (
        <>
          {children}
          {icon}
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </span>
  );
}
