import { NextResponse } from "next/server";
import { CrossOriginError, HttpError } from "./errors";
import { logger } from "./logger";

// Sessions are carried by sameSite: "lax" cookies, which keep a cross-site form
// post from carrying them. This is the second lock: a request that changes
// anything must say where it came from, and it must have come from here.
//
// Only the host is compared, never the scheme. TLS terminates at the platform's
// proxy, so the request the app sees is http while the browser's Origin says
// https, and comparing whole origins would reject every real request.
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function hostOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).host || null;
  } catch {
    return null;
  }
}

function allowedHosts(req: Request): Set<string> {
  const hosts = new Set<string>();
  const configured = hostOf(process.env.NEXT_PUBLIC_BASE_URL ?? null);
  if (configured) hosts.add(configured);

  const forwarded = req.headers.get("x-forwarded-host");
  if (forwarded) hosts.add(forwarded);

  const host = req.headers.get("host");
  if (host) hosts.add(host);

  const own = hostOf(req.url);
  if (own) hosts.add(own);

  return hosts;
}

// Next hands the request to every route handler, including the twenty-four
// declared without a parameter, so the check cannot be skipped by how a handler
// chose to spell its arguments. A call with no request at all reaches this only
// from a test.
function requireSameOrigin(candidate: unknown): void {
  if (!(candidate instanceof Request)) return;
  if (SAFE_METHODS.has(candidate.method)) return;

  const claimed =
    hostOf(candidate.headers.get("origin")) ?? hostOf(candidate.headers.get("referer"));
  if (!claimed || !allowedHosts(candidate).has(claimed)) throw new CrossOriginError();
}

// A handler written without a request still receives one at runtime, so the
// wrapper accepts it either way rather than trusting the declared arity.
type RouteArgs<Args extends unknown[]> = Args extends [] ? [Request?] : Args;

export function withRoute<Args extends unknown[]>(
  name: string,
  handler: (...args: Args) => Promise<NextResponse>,
) {
  return async (...args: RouteArgs<Args>): Promise<NextResponse> => {
    try {
      const [first] = args as unknown as unknown[];
      requireSameOrigin(first);
      return await handler(...(args as unknown as Args));
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.clientMessage }, { status: err.status });
      }
      logger.error(name, err);
      return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
    }
  };
}
