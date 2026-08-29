import { NextResponse } from "next/server";
import { CrossOriginError, HttpError } from "./errors";
import { logger } from "./logger";

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

function requireSameOrigin(candidate: unknown): void {
  if (!(candidate instanceof Request)) return;
  if (SAFE_METHODS.has(candidate.method)) return;

  const claimed =
    hostOf(candidate.headers.get("origin")) ?? hostOf(candidate.headers.get("referer"));
  if (!claimed || !allowedHosts(candidate).has(claimed)) throw new CrossOriginError();
}

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
