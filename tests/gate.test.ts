import { test } from "node:test";
import assert from "node:assert/strict";

import { cacheFor, COOKIE, gate, repMayOpen, safeNext } from "../netlify/gate-core.ts";

const env = { teamPassword: "team-pass", repPassword: "rep-pass", secret: "s3cret" };
const NOW = 1_800_000_000_000;
const site = "https://sop.threadcloud.io";

function get(path: string, cookie?: string): Request {
  return new Request(site + path, { headers: cookie ? { cookie } : {} });
}

async function signIn(password: string, next = "/"): Promise<{ status: number; location: string | null; cookie: string | null }> {
  const body = new URLSearchParams({ password, next });
  const res = await gate(new Request(`${site}/gate`, { method: "POST", body, headers: { "content-type": "application/x-www-form-urlencoded" } }), env, NOW);
  assert.ok(res);
  const set = res.headers.get("set-cookie");
  return { status: res.status, location: res.headers.get("location"), cookie: set ? set.split(";")[0] : null };
}

test("every page is locked without a session, and sends you to the lock page", async () => {
  const res = await gate(get("/workflows/build-order/"), env, NOW);
  assert.equal(res?.status, 303);
  assert.equal(res?.headers.get("location"), "/gate?next=%2Fworkflows%2Fbuild-order%2F");
  const index = await gate(get("/pagefind/pagefind.js"), env, NOW);
  assert.equal(index?.status, 303);
});

test("with no team password or secret set, every page stays locked", async () => {
  for (const partial of [{}, { teamPassword: "x" }, { secret: "y" }]) {
    const res = await gate(get("/"), partial, NOW);
    assert.equal(res?.status, 503);
  }
});

test("the team password opens every page, including search", async () => {
  const { status, location, cookie } = await signIn("team-pass", "/workflows/build-order/");
  assert.equal(status, 303);
  assert.equal(location, "/workflows/build-order/");
  assert.ok(cookie?.startsWith(`${COOKIE}=team.`));
  assert.equal(await gate(get("/workflows/build-order/", cookie!), env, NOW), null);
  assert.equal(await gate(get("/pagefind/pagefind.js", cookie!), env, NOW), null);
  assert.equal(await gate(get("/reps/", cookie!), env, NOW), null);
});

test("the rep password opens the rep pages only", async () => {
  const { location, cookie } = await signIn("rep-pass", "/workflows/build-order/");
  assert.equal(location, "/reps/");
  assert.ok(cookie?.startsWith(`${COOKIE}=rep.`));
  assert.equal(await gate(get("/reps/orders/", cookie!), env, NOW), null);
  assert.equal(await gate(get("/_astro/site.css", cookie!), env, NOW), null);
  const team = await gate(get("/workflows/build-order/", cookie!), env, NOW);
  assert.equal(team?.headers.get("location"), "/gate?team=1&next=%2Fworkflows%2Fbuild-order%2F");
  const search = await gate(get("/pagefind/pagefind-entry.json", cookie!), env, NOW);
  assert.equal(search?.status, 303);
  assert.equal((await gate(get("/", cookie!), env, NOW))?.headers.get("location"), "/reps/");
});

test("a wrong password opens nothing", async () => {
  const { status, cookie } = await signIn("team-pas");
  assert.equal(status, 401);
  assert.equal(cookie, null);
  assert.equal((await signIn("")).status, 401);
});

test("a forged, tampered or expired session is refused", async () => {
  const { cookie } = await signIn("rep-pass");
  const [name, value] = cookie!.split("=");
  const [, expires, signature] = value.split(".");
  const promoted = `${name}=team.${expires}.${signature}`;
  assert.equal((await gate(get("/workflows/", promoted), env, NOW))?.status, 303);
  assert.equal((await gate(get("/reps/", `${COOKIE}=rep.${expires}.00`), env, NOW))?.status, 303);
  assert.equal((await gate(get("/reps/", cookie!), env, Number(expires) + 1))?.status, 303);
});

test("changing a password ends the sessions opened with it", async () => {
  const { cookie } = await signIn("team-pass");
  assert.equal((await gate(get("/", cookie!), { ...env, teamPassword: "new-pass" }, NOW))?.status, 303);
});

test("with no rep password set, the rep password and rep sessions open nothing", async () => {
  const { cookie } = await signIn("rep-pass");
  const noRep = { teamPassword: "team-pass", secret: "s3cret" };
  assert.equal((await gate(get("/reps/", cookie!), noRep, NOW))?.status, 303);
  const body = new URLSearchParams({ password: "rep-pass", next: "/" });
  const res = await gate(new Request(`${site}/gate`, { method: "POST", body }), noRep, NOW);
  assert.equal(res?.status, 401);
});

test("after signing in you only ever land on this site", () => {
  assert.equal(safeNext("https://evil.example/"), "/");
  assert.equal(safeNext("//evil.example/"), "/");
  assert.equal(safeNext("/\\evil.example/"), "/");
  assert.equal(safeNext("/gate?next=/x"), "/");
  assert.equal(safeNext("/reps/orders/?a=1"), "/reps/orders/?a=1");
  assert.equal(repMayOpen("/representatives"), false);
  assert.equal(repMayOpen("/reps"), true);
});

test("pages and the search index are never kept in the browser cache; shared style files are", () => {
  assert.equal(cacheFor("/workflows/build-order/"), "private, no-store");
  assert.equal(cacheFor("/pagefind/pagefind.js"), "private, no-store");
  assert.equal(cacheFor("/reps/"), "private, no-store");
  assert.equal(cacheFor("/_astro/site.css"), null);
});

test("the same password for team and reps keeps the manual locked", async () => {
  const same = { teamPassword: "one-pass", repPassword: "one-pass", secret: "s3cret" };
  assert.equal((await gate(get("/reps/"), same, NOW))?.status, 503);
  const body = new URLSearchParams({ password: "one-pass", next: "/" });
  assert.equal((await gate(new Request(`${site}/gate`, { method: "POST", body }), same, NOW))?.status, 503);
});

test("signing out ends the session", async () => {
  const res = await gate(get("/gate/out"), env, NOW);
  assert.equal(res?.status, 303);
  assert.equal(res?.headers.get("location"), "/gate");
  assert.match(res?.headers.get("set-cookie") ?? "", new RegExp(`^${COOKIE}=; .*Max-Age=0`));
});
