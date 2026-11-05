"use client";

import { useState } from "react";
import { useData } from "@/components/admin/data";
import { ConfirmDialog, PageHeader, useToast } from "@/components/admin/ui";
import { clearAll, resetToSample } from "@/lib/db";

export default function SettingsPage() {
  const { reload } = useData();
  const toast = useToast();
  const [action, setAction] = useState<"reset" | "clear" | null>(null);

  async function runAction() {
    if (action === "reset") await resetToSample();
    if (action === "clear") await clearAll();
    await reload();
    toast(action === "reset" ? "Sample data restored." : "All records deleted.");
    setAction(null);
  }

  return (
    <>
      <PageHeader title="Settings" />

      <section className="a-card a-section a-settings">
        <h2>Admin sign-in</h2>
        <p className="a-muted">For now, the username and password are set in the project&apos;s .env file. To change them, edit ADMIN_USERNAME and ADMIN_PASSWORD there and restart the app.</p>
      </section>

      <section className="a-card a-section a-settings">
        <h2>Demo data</h2>
        <p className="a-muted">Everything is stored only in this browser until the backend is built. Clearing your browser data removes it.</p>
        <div className="a-danger-actions">
          <button type="button" className="btn a-btn-ghost" onClick={() => setAction("reset")}>Restore sample data</button>
          <button type="button" className="btn a-btn-danger" onClick={() => setAction("clear")}>Delete all records</button>
        </div>
      </section>

      <ConfirmDialog
        open={!!action}
        title={action === "reset" ? "Restore sample data?" : "Delete all records?"}
        message={action === "reset" ? "Your cars, drivers, bookings, driver services and costs will be replaced with the sample set. This can't be undone." : "All cars, drivers, bookings, driver services and costs will be deleted, and the website's fleet will be empty. This can't be undone."}
        confirmLabel={action === "reset" ? "Restore sample data" : "Delete everything"}
        onClose={() => setAction(null)}
        onConfirm={runAction}
      />
    </>
  );
}
