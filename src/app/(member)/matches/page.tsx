import PageHeader from "@/components/PageHeader";
import MatchesList from "./MatchesList";
import { memberMatches as texts } from "@/lib/texts";

export const dynamic = "force-dynamic";

export default function MyMatchesPage() {
  return (
    <div className="app-shell">
      <PageHeader title={texts.title} backHref="/home" />
      <MatchesList />
    </div>
  );
}
