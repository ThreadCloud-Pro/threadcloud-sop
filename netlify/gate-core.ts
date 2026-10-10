/*
 * The manual's lock, checked on Netlify before any page is sent (Gregory, 2026-10-10).
 * The team password opens every page; the rep password opens only the rep pages.
 * Both passwords and the signing secret live in Netlify's environment, never in this repo.
 * With no team password or secret set, every page stays locked.
 *
 * Plain TypeScript with Web APIs only, so the same file runs on Netlify's edge (Deno)
 * and under node:test.
 */

export type Role = "team" | "rep";

export interface GateEnv {
  readonly teamPassword?: string;
  readonly repPassword?: string;
  readonly secret?: string;
}

export const COOKIE = "tc_sop_gate";
const DAYS = 30;
const encoder = new TextEncoder();

/** Paths anyone may load: the lock page itself and the site icon. */
function isPublic(path: string): boolean {
  return path === "/gate" || path === "/gate/out" || path === "/favicon.ico" || path === "/favicon.svg";
}

/** What the rep password opens: the rep pages and the files every page needs. */
export function repMayOpen(path: string): boolean {
  return path === "/reps" || path.startsWith("/reps/") || path.startsWith("/_astro/");
}

async function hmac(key: string, message: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, encoder.encode(message)));
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Equal strings, compared through their HMACs so neither length nor content leaks through timing. */
async function same(secret: string, a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([hmac(secret, a), hmac(secret, b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/** A session is signed with the password it was opened with, so changing a password ends its sessions. */
function signingKey(env: GateEnv, role: Role): string {
  return `${env.secret}|${role === "team" ? env.teamPassword : env.repPassword}`;
}

export async function sessionCookie(env: GateEnv, role: Role, now: number): Promise<string> {
  const expires = now + DAYS * 24 * 60 * 60 * 1000;
  const body = `${role}.${expires}`;
  const signature = hex(await hmac(signingKey(env, role), body));
  return `${COOKIE}=${body}.${signature}; Path=/; Max-Age=${DAYS * 24 * 60 * 60}; HttpOnly; Secure; SameSite=Lax`;
}

export async function roleFrom(request: Request, env: GateEnv, now: number): Promise<Role | null> {
  const raw = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`));
  if (!raw) return null;
  const [role, expires, signature] = raw.slice(COOKIE.length + 1).split(".");
  if ((role !== "team" && role !== "rep") || !expires || !signature) return null;
  if (role === "rep" && !env.repPassword) return null;
  if (!(Number(expires) > now)) return null;
  const expected = hex(await hmac(signingKey(env, role), `${role}.${expires}`));
  return (await same(env.secret ?? "", expected, signature)) ? role : null;
}

/** Only a path on this site: never another host, and never back to the lock page. */
export function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\") || raw.startsWith("/gate")) return "/";
  return raw;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

export function lockPage(next: string, message: string | null, status = 200): Response {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>ThreadCloud manual</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f0e0b;font-family:Inter,system-ui,sans-serif}
form{background:#1a1915;border:1px solid #2e2c25;border-radius:12px;padding:40px 48px;width:340px;max-width:90vw;box-sizing:border-box;text-align:center}
h1{font-family:'Instrument Serif',Georgia,serif;font-weight:400;font-size:22px;color:#f5f0e8;margin:0 0 8px}
p{font-size:13px;color:#8a8070;margin:0 0 28px}
input{width:100%;box-sizing:border-box;padding:11px 14px;background:#0f0e0b;border:1px solid #3a3830;border-radius:6px;color:#f5f0e8;font-size:15px;margin-bottom:14px}
input:focus{border-color:#c4843a;outline:none}
button{width:100%;padding:11px;background:#c4843a;border:0;border-radius:6px;color:#fff;font-size:14px;font-weight:600;cursor:pointer}
.err{font-size:12px;color:#e05252;margin:12px 0 0}
</style></head><body>
<form method="post" action="/gate">
<h1>ThreadCloud manual</h1>
<p>Enter the password ThreadCloud gave you.</p>
<input type="hidden" name="next" value="${escapeHtml(next)}">
<input type="password" name="password" placeholder="Password" autocomplete="current-password" autofocus required>
<button type="submit">Enter</button>
${message ? `<p class="err" role="alert">${escapeHtml(message)}</p>` : ""}
</form></body></html>`;
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

function redirect(location: string, cookie?: string): Response {
  const headers = new Headers({ location, "cache-control": "no-store" });
  if (cookie) headers.set("set-cookie", cookie);
  return new Response(null, { status: 303, headers });
}

/**
 * The caching a page the lock let through goes out with. Content and the search index are never
 * kept by the browser, so signing out or switching to the rep password cannot read them back from
 * its cache. The shared, content-free style and script files keep their normal caching.
 */
export function cacheFor(path: string): string | null {
  return path.startsWith("/_astro/") ? null : "private, no-store";
}

/**
 * Decide one request. A Response means answer with it; null means let the page through.
 */
export async function gate(request: Request, env: GateEnv, now = Date.now()): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (!env.teamPassword || !env.secret) {
    return new Response("The manual is locked until its passwords are set.", { status: 503, headers: { "cache-control": "no-store" } });
  }

  if (path === "/gate/out") return redirect("/gate", `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);

  if (path === "/gate") {
    if (request.method !== "POST") return lockPage(safeNext(url.searchParams.get("next")), url.searchParams.get("team") ? "That page needs the team password." : null);
    const form = await request.formData();
    const password = String(form.get("password") ?? "");
    const next = safeNext(String(form.get("next") ?? ""));
    let role: Role | null = null;
    if (password && (await same(env.secret, password, env.teamPassword))) role = "team";
    else if (password && env.repPassword && (await same(env.secret, password, env.repPassword))) role = "rep";
    if (!role) return lockPage(next, "That password is not right.", 401);
    const landing = role === "rep" && !repMayOpen(next) ? "/reps/" : next;
    return redirect(landing, await sessionCookie(env, role, now));
  }

  if (isPublic(path)) return null;

  const role = await roleFrom(request, env, now);
  if (role === "team") return null;
  if (role === "rep") {
    if (repMayOpen(path)) return null;
    if (path === "/") return redirect("/reps/");
    return redirect(`/gate?team=1&next=${encodeURIComponent(path + url.search)}`);
  }
  if (request.method === "GET" || request.method === "HEAD") return redirect(`/gate?next=${encodeURIComponent(path + url.search)}`);
  return new Response("Locked.", { status: 401, headers: { "cache-control": "no-store" } });
}
