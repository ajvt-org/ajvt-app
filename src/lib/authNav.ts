import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

// Signing in or out changes what every server component on the way to a page
// renders, but the router keeps the layouts it has already fetched. The
// bottom bar lives in the (member) layout, so after signing out and back in
// it kept offering a visitor's tabs — including a "دخول" that led nowhere —
// until the page was reloaded by hand. Only refresh drops that cache.
//
// It never showed in `next dev`, which keeps no such cache. Reproducing it
// takes a production build.
export function goAfterAuthChange(router: AppRouterInstance, href: string) {
  router.push(href);
  router.refresh();
}
