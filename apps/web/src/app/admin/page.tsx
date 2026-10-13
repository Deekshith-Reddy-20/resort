"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminDashboard } from "@/components/AdminDashboard";

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/overview").then((res) => {
      if (res.status === 401) setAuthed(false);
      else if (res.ok) setAuthed(true);
    });
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
          No default production password exists. Set STAFF_SESSION_SECRET, STAFF_DEV_EMAIL and STAFF_DEV_PASSWORD for local
          access, or connect Supabase Auth.
        </p>
        <form onSubmit={login} className="mt-6 space-y-3">
          <input name="email" type="email" required placeholder="Staff email" className="field" />
          <input name="password" type="password" required minLength={8} placeholder="Password" className="field" />
          <button className="btn-primary w-full">Sign in</button>
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
