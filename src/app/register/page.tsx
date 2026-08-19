"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import PageLoading from "@/components/PageLoading";

// Account creation moved into /form as step 2 of the registration wizard —
// this route stays only so old links/bookmarks don't dead-end.
export default function RegisterPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/form");
  }, [router]);

  return (
    <div className="app-shell flex">
      <PageLoading />
    </div>
  );
}
