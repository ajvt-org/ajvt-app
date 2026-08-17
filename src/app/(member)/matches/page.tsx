import PageHeader from "@/components/PageHeader";
import MatchesList from "./MatchesList";

export const dynamic = "force-dynamic";

export default function MyMatchesPage() {
  return (
    <div className="app-shell">
      <PageHeader title="مبارياتي" backHref="/home" />
      <MatchesList />
    </div>
  );
}
