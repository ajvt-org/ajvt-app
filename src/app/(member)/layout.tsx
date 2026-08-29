import { getUserSession } from "@/lib/auth";
import MemberTabs from "@/components/MemberTabs";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const session = await getUserSession();

  return (
    <>
      {children}
      <MemberTabs signedIn={Boolean(session)} />
    </>
  );
}
