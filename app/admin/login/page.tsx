"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { isLoggedIn, login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) router.replace("/admin");
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Enter your username and password.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (await login(username, password)) {
        router.replace("/admin");
        return;
      }
      setError("That username or password is wrong. Check them and try again.");
    } catch (err) {
      setError(err instanceof TypeError ? "Couldn't reach the server. Check your connection and try again." : (err as Error).message);
    }
    setBusy(false);
  }

  return (
    <main className="a-login">
      <form className="a-login__card" onSubmit={submit} noValidate>
        <p className="logo">SCARS<span className="logo__dot" aria-hidden="true" /></p>
        <h1 className="a-title">Admin sign in</h1>

        <div className="a-field">
          <label htmlFor="username">Username</label>
          <input id="username" className="a-input" autoComplete="username" autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="a-field">
          <label htmlFor="password">Password</label>
          <div className="a-password">
            <input id="password" className="a-input" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="a-icon-btn" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>
              <Icon name={showPassword ? "eye-off" : "eye"} />
            </button>
          </div>
        </div>

        {error && <p className="a-error a-error--form" role="alert">{error}</p>}
        <button type="submit" className="btn btn--dark btn--lg a-login__submit" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
        <a href="/" className="a-login__back">Back to website</a>
      </form>
    </main>
  );
}
