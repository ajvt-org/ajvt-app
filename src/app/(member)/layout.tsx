import { getUserSession } from "@/lib/auth";
import MemberTabs from "@/components/MemberTabs";

// A route group, so the paths stay /home, /donate and /quiz. The bar lives
// here rather than in each page because these pages return early several
// times over — loading, done, not-yet-confirmed — and a bar mounted per
// branch goes missing on whichever branch nobody remembered.
//
// /donate and /quiz are reachable without an account, so the session decides
// which set of tabs to draw. Drawing the member set at a visitor sends them
// to /home, which bounces them straight to the login page.
export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const session = await getUserSession();

  return (
    <>
      {children}
      <MemberTabs signedIn={Boolean(session)} />
    </>
  );
}
