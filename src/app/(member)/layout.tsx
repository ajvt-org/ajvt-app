import MemberTabs from "@/components/MemberTabs";

// A route group, so the paths stay /home, /donate and /quiz. The bar lives
// here rather than in each page because these pages return early several
// times over — loading, done, not-yet-confirmed — and a bar mounted per
// branch goes missing on whichever branch nobody remembered.
export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <MemberTabs />
    </>
  );
}
