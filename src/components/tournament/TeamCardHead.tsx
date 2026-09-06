import TeamLogo from "./TeamLogo";
import { MATCH_TEAMS_SIZES } from "./matchCard/MatchTeams";
import IconLabel from "@/components/IconLabel";

export default function TeamCardHead({
  logo,
  name,
  note,
}: {
  logo: string | null;
  name: string;
  note: string;
}) {
  return (
    <>
      <TeamLogo logo={logo} name={name} size={MATCH_TEAMS_SIZES.md.logo} />
      <span className="min-w-0 flex-1" style={{ wordBreak: "break-word" }}>
        {name}
      </span>
      <span className="shrink-0 text-xs" style={{ color: "var(--text-muted)", fontWeight: 400 }}>
        <IconLabel name="users">{note}</IconLabel>
      </span>
    </>
  );
}
