"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminDashboard } from "@/components/AdminDashboard";

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<"dev" | "supabase" | "none">("none");
  const [configured, setConfigured] = useState(false);
  const [missingEnv, setMissingEnv] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/session")
      .then((res) => res.json())
      .then((data) => {
        setConfigured(Boolean(data.configured));
        setMethod(data.method ?? "none");
        setMissingEnv(Array.isArray(data.missingEnv) ? data.missingEnv : []);
        setStatusMessage(typeof data.message === "string" ? data.message : null);
        if (data.authenticated) setAuthed(true);
      })
      .catch(() => undefined);
  }, []);

  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    else setAuthed(true);
  }

  if (!authed) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="font-serif text-4xl">Staff sign-in</h1>
        <p className="mt-3 text-sm text-muted">
          {method === "supabase"
            ? "Sign in with an authorized Supabase Auth staff account. Roles come from admin_profiles, not from the browser."
            : method === "dev"
              ? "Local development password login is enabled on this machine only."
              : statusMessage ?? "Staff authentication is not configured on the server. Hosted sites need STAFF_SESSION_SECRET, Supabase Auth, and an admin_profiles row. Development passwords are not used in production."}
        </p>
        {missingEnv.length ? (
          <ul className="mt-3 list-disc pl-5 text-sm text-forest">
            {missingEnv.map((name) => (
              <li key={name}>
                <code>{name}</code>
              </li>
            ))}
          </ul>
        ) : null}
        <form onSubmit={login} className="mt-6 space-y-3">
          <input name="email" type="email" required placeholder="Staff email" className="field" disabled={!configured && method === "none"} />
          <input name="password" type="password" required minLength={8} placeholder="Password" className="field" disabled={!configured && method === "none"} />
          <button className="btn-primary w-full" disabled={!configured && method === "none"}>
            Sign in
          </button>
        </form>
        {error ? <p className="mt-4 text-dragon">{error}</p> : null}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <AdminDashboard
        onLogout={async () => {
          await fetch("/api/admin/session", { method: "DELETE" });
          setAuthed(false);
        }}
        onUnauthorized={() => setAuthed(false)}
      />
    </main>
  );
}
