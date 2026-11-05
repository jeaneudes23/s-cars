"use client";

import { useEffect, useState } from "react";
import { Field, PageHeader, useToast } from "@/components/admin/ui";
import { currentUsername, updateCredentials } from "@/lib/auth";

export default function SettingsPage() {
  const toast = useToast();
  const [username, setUsername] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { currentUsername().then(setUsername); }, []);

  async function saveCredentials(e: React.FormEvent) {
    e.preventDefault();
    const found: Record<string, string> = {};
    if (!username.trim()) found.username = "Enter a username.";
    if (!current) found.current = "Enter your current password.";
    if (next && next.length < 8) found.next = "Use at least 8 characters.";
    if (next !== confirm) found.confirm = "This doesn't match the new password.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    const failed = await updateCredentials({ currentPassword: current, username, newPassword: next || undefined });
    setBusy(false);
    if (failed) {
      setErrors({ [failed.field]: failed.message });
      return;
    }
    setCurrent(""); setNext(""); setConfirm("");
    toast(next ? "Username and password updated." : "Username updated.");
  }

  return (
    <>
      <PageHeader title="Settings" />

      <section className="a-card a-section a-settings">
        <h2>Admin sign-in</h2>
        <p className="a-muted">Change the username or password used to open the admin. Leave the new password empty to keep it. A new password signs you out on every other device.</p>
        <form className="a-form" onSubmit={saveCredentials} noValidate>
          <Field label="Username" required wide error={errors.username}>
            {(p) => <input {...p} className="a-input" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />}
          </Field>
          <Field label="Current password" required wide error={errors.current}>
            {(p) => <input {...p} className="a-input" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />}
          </Field>
          <Field label="New password" error={errors.next} hint="At least 8 characters.">
            {(p) => <input {...p} className="a-input" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />}
          </Field>
          <Field label="Repeat new password" error={errors.confirm}>
            {(p) => <input {...p} className="a-input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
          </Field>
          {errors.form && <p className="a-error a-error--form a-field--wide" role="alert">{errors.form}</p>}
          <div className="a-field--wide a-form-actions">
            <button type="submit" className="btn btn--dark" disabled={busy}>{busy ? "Saving..." : "Save changes"}</button>
          </div>
        </form>
      </section>
    </>
  );
}
