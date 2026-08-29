import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export function goAfterAuthChange(router: AppRouterInstance, href: string) {
  router.push(href);
  router.refresh();
}
