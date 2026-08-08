import { redirect } from "next/navigation";

// This page is no longer used; redirect to home
export default function OldMemberPage() {
  redirect("/home");
}
