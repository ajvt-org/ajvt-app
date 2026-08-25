import { permanentRedirect } from "next/navigation";

export default async function PublicTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  permanentRedirect(`/activities/${id}`);
}
