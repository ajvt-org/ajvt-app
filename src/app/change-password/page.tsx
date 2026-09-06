import PageHeader from "@/components/PageHeader";
import { getUserSession } from "@/lib/auth";
import { changePassword as texts } from "@/lib/texts";
import ChangePasswordForm from "./ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const session = await getUserSession();
  const locked = !!(session as { mustChangePassword?: boolean } | null)?.mustChangePassword;

  return (
    <div className="app-shell">
      <PageHeader title={texts.title} backHref={locked ? undefined : "/profile"} />
      <ChangePasswordForm locked={locked} />
    </div>
  );
}
