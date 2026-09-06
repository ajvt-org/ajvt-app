import { get, withParams } from "./helpers";

type Handler = (req: unknown, ctx: unknown) => Promise<Response>;
type Loader = () => Promise<Record<string, unknown>>;

const MODULES = import.meta.glob("../../src/app/api/admin/**/route.ts") as Record<string, Loader>;

export interface SweptRoute {
  path: string;
  key: string;
  params: Record<string, string>;
}

export interface Fixture {
  activityId: string;
  methodId: string;
  userId: string;
  competitionId: string;
  attemptId: string;
  matchId: string;
  datasets: string[];
}

function pathOf(file: string): string {
  return file.replace("../../src/app/api/admin/", "").replace("/route.ts", "");
}

function paramsFor(path: string, fixture: Fixture): Record<string, string> | null {
  if (path.startsWith("activities/")) return { id: fixture.activityId };
  if (path.startsWith("payment-methods/")) return { id: fixture.methodId };
  if (path.startsWith("members/")) return { id: fixture.userId };
  if (path.startsWith("quiz/competitions/")) return { id: fixture.competitionId };
  if (path.startsWith("quiz/attempts/")) return { id: fixture.attemptId };
  if (path.startsWith("matches/")) return { matchId: fixture.matchId };
  return null;
}

export function routesUnder(fixture: Fixture): SweptRoute[] {
  const swept: SweptRoute[] = [];
  for (const file of Object.keys(MODULES)) {
    const path = pathOf(file);
    if (path.includes("[dataset]")) {
      for (const dataset of fixture.datasets) {
        swept.push({ path, key: path.replace("[dataset]", dataset), params: { dataset } });
      }
      continue;
    }
    if (!path.includes("[")) {
      swept.push({ path, key: path, params: {} });
      continue;
    }
    const params = paramsFor(path, fixture);
    if (params === null) continue;
    swept.push({ path, key: path, params });
  }
  return swept.sort((a, b) => a.key.localeCompare(b.key));
}

export async function unresolved(fixture: Fixture): Promise<string[]> {
  const dynamic = Object.keys(MODULES)
    .map(pathOf)
    .filter((path) => path.includes("[") && !path.includes("[dataset]"))
    .filter((path) => paramsFor(path, fixture) === null);

  const served = await Promise.all(dynamic.map((path) => handlerFor(path)));
  return dynamic.filter((_, index) => served[index] !== null);
}

function urlFor(route: SweptRoute): string {
  let url = `/api/admin/${route.path}`;
  for (const [key, value] of Object.entries(route.params)) url = url.replace(`[${key}]`, value);
  return url;
}

async function handlerFor(path: string): Promise<Handler | null> {
  const file = Object.keys(MODULES).find((candidate) => pathOf(candidate) === path);
  if (!file) return null;
  const loaded = await MODULES[file]();
  return typeof loaded.GET === "function" ? (loaded.GET as Handler) : null;
}

export interface SweepResult {
  naming: string[];
  reached: string[];
  threw: string[];
}

export async function sweep(routes: SweptRoute[], name: string): Promise<SweepResult> {
  const naming: string[] = [];
  const reached: string[] = [];
  const threw: string[] = [];

  for (const route of routes) {
    const handler = await handlerFor(route.path);
    if (!handler) continue;
    const url = urlFor(route);
    try {
      const response = await handler(get(url), withParams(route.params));
      const body = await response.text();
      if (response.status < 500) reached.push(route.key);
      else threw.push(route.key);
      if (body.includes(name)) naming.push(route.key);
    } catch {
      threw.push(route.key);
    }
  }

  return { naming, reached, threw };
}
