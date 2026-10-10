/* Runs on Netlify's edge before every page of the manual; the rules are in ../gate-core.ts. */
import { cacheFor, gate } from "../gate-core.ts";

declare const Netlify: { env: { get(name: string): string | undefined } };

export default async function handler(request: Request, context: { next: () => Promise<Response> }): Promise<Response> {
  const answer = await gate(request, {
    teamPassword: Netlify.env.get("SOP_TEAM_PASSWORD"),
    repPassword: Netlify.env.get("SOP_REP_PASSWORD"),
    secret: Netlify.env.get("SOP_GATE_SECRET"),
  });
  if (answer) return answer;
  const page = await context.next();
  const cache = cacheFor(new URL(request.url).pathname);
  if (!cache) return page;
  const sent = new Response(page.body, page);
  sent.headers.set("cache-control", cache);
  return sent;
}

export const config = { path: "/*" };
