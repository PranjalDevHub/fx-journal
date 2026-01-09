"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);

    const result =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (result.error) setError(result.error.message);
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-sm space-y-4 p-6">
      <h1 className="text-xl font-semibold">
        {mode === "signin" ? "Sign in" : "Create account"}
      </h1>

      <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <Button className="w-full" disabled={busy} onClick={submit}>
        {mode === "signin" ? "Sign in" : "Sign up"}
      </Button>

      <button
        className="text-sm text-muted-foreground underline"
        onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
      >
        {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
      </button>

      <div className="text-xs text-muted-foreground">
        If signup doesn’t log you in, open Supabase → Authentication → Providers → Email and disable
        “Confirm email” for testing.
      </div>
    </div>
  );
}