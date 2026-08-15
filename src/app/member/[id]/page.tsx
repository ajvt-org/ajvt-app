import { redirect } from "next/navigation";

// Kept only for links handed out before the account moved to /profile.
export default function OldMemberPage() {
  redirect("/profile");
}
