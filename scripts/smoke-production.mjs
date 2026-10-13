/**
 * Read-only production smoke. Does not create bookings or payments.
 * Exit 1 if inventory persistence is missing or availability is claimed without persistency.
 */
const base = (process.env.VFARMS_SMOKE_URL || "https://resort-delta-nine.vercel.app").replace(/\/$/, "");
let failed = 0;

function fail(label, detail) {
  failed += 1;
  console.error("FAIL", label, detail);
}

function pass(label, detail) {
  console.log("PASS", label, detail);
}

async function get(path) {
  const res = await fetch(`${base}${path}`, { headers: { "cache-control": "no-store" } });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { res, text, json };
}

const home = await get("/");
if (home.res.ok) pass("GET /", home.res.status);
else fail("GET /", home.res.status);

const stays = await get("/stays");
if (stays.res.ok) pass("GET /stays", stays.res.status);
else fail("GET /stays", stays.res.status);

const config = await get("/api/public/config");
if (!config.json) {
  fail("GET /api/public/config", "non-JSON");
} else {
  const persistencyReady = Boolean(config.json.persistencyReady);
  const reason = config.json.persistFailure?.reason ?? null;
  console.log("config", config.res.status, "persistencyReady=" + persistencyReady, "reason=" + reason, "bookingEnabled=" + config.json.bookingEnabled, "maxGuests=" + config.json.maxGuests);
  if (config.res.status === 503 || reason === "missing_table") {
    fail("inventory persistence", config.json.missingSettings?.[0] ?? reason);
  } else if (!config.res.ok) {
    fail("GET /api/public/config", config.res.status);
  } else if (!persistencyReady) {
    fail("persistencyReady", "false on HTTP 200");
  } else {
    pass("inventory persistence", "runtime_state readable");
  }
  if (config.json.bookingEnabled === true && !config.json.maxGuests) {
    fail("capacity", "bookingEnabled without maxGuests");
  }
}

const session = await get("/api/admin/session");
if (!session.json) fail("GET /api/admin/session", "non-JSON");
else {
  console.log("staff", "configured=" + session.json.configured, "method=" + session.json.method, "authenticated=" + session.json.authenticated);
  if (!session.json.configured || session.json.method !== "supabase") {
    fail("staff configuration", session.json.method ?? "none");
  } else {
    pass("staff configuration", session.json.method);
  }
  if (session.json.authenticated) fail("unauthenticated session", "expected authenticated=false without cookie");
}

const search = await fetch(`${base}/api/availability/search`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ product: "stay", startDate: "2026-12-01", endDate: "2026-12-03", guests: 2 }),
});
const searchJson = await search.json().catch(() => null);
console.log("availability", search.status, "available=" + searchJson?.available, "code=" + searchJson?.code);
if (search.status === 503) {
  fail("availability search", searchJson?.code ?? "503");
} else if (search.ok && searchJson?.available === true && config.json && !config.json.persistencyReady) {
  fail("availability search", "claimed available while persistency is not ready");
} else if (search.ok && searchJson?.available === false) {
  pass("availability search", "did not claim available");
} else if (search.ok) {
  pass("availability search", "HTTP 200");
} else {
  fail("availability search", search.status);
}

if (failed) {
  console.error(failed + " smoke check(s) failed against " + base);
  process.exit(1);
}
console.log("smoke passed against " + base);
