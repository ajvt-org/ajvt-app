import PageHeader from "@/components/PageHeader";
import { getUserSession, tempPasswordRanOut } from "@/lib/auth";
import { changePassword as texts } from "@/lib/texts";
import ChangePasswordForm from "./ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const [session, expired] = await Promise.all([getUserSession(), tempPasswordRanOut()]);
  const locked = !!(session as { mustChangePassword?: boolean } | null)?.mustChangePassword;

  return (
    <div className="app-shell">
      <PageHeader title={texts.title} backHref={locked || expired ? undefined : "/profile"} />
      <ChangePasswordForm locked={locked} expired={expired} />
    </div>
  );
}
