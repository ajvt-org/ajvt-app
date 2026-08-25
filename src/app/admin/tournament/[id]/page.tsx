import { redirect } from "next/navigation";

export default async function TournamentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  redirect(`/admin/activities/${id}?tab=${tab || "matches"}`);
}
