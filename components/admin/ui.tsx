"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <header className="a-page-head">
      <div>
        <h1 className="a-title">{title}</h1>
        {subtitle && <p className="a-subtitle">{subtitle}</p>}
      </div>
      {children && <div className="a-page-actions">{children}</div>}
    </header>
  );
}

export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" className="btn btn--dark" onClick={onClick}><Icon name="plus" />{label}</button>;
}

export function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="a-card a-stat">
      <p className="a-stat__label">{label}</p>
      <p className="a-stat__value">{value}</p>
      {note && <p className="a-stat__note">{note}</p>}
    </div>
  );
}

export type Tone = "good" | "warn" | "bad" | "info" | "muted";

export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`a-badge a-badge--${tone}`}><span className="a-badge__dot" aria-hidden="true" />{children}</span>;
}

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { key: T; label: string }[]; onChange: (key: T) => void }) {
  return (
    <div className="a-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.key} type="button" className={value === o.key ? "is-active" : ""} aria-pressed={value === o.key} onClick={() => onChange(o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function IconButton({ icon, label, onClick, danger }: { icon: IconName; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" className={`a-icon-btn ${danger ? "a-icon-btn--danger" : ""}`} aria-label={label} title={label} onClick={onClick}>
      <Icon name={icon} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Table. Becomes stacked cards on phones, using each column's label.
// ---------------------------------------------------------------------------
export type Column<T> = { label: string; render: (row: T) => React.ReactNode; align?: "right"; hideLabel?: boolean };

const PAGE_SIZE = 25;

export function DataTable<T extends { id: string }>({ columns, rows, empty, caption }: { columns: Column<T>[]; rows: T[]; empty: React.ReactNode; caption: string }) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  if (rows.length === 0) return <div className="a-empty">{empty}</div>;
  return (
    <>
      <div className="a-table-scroll" tabIndex={0} role="region" aria-label={caption}>
        <table className="a-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>{columns.map((c) => <th key={c.label} scope="col" className={c.align === "right" ? "is-right" : ""}>{c.hideLabel ? <span className="sr-only">{c.label}</span> : c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.slice(0, limit).map((row) => (
            <tr key={row.id}>
              {columns.map((c) => <td key={c.label} data-label={c.hideLabel ? undefined : c.label} className={c.align === "right" ? "is-right" : ""}><div>{c.render(row)}</div></td>)}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {rows.length > limit && (
        <div className="a-more">
          <button type="button" className="btn a-btn-ghost" onClick={() => setLimit(limit + PAGE_SIZE)}>Show more ({rows.length - limit} left)</button>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Dialogs: native <dialog> handles focus trapping and Escape.
// ---------------------------------------------------------------------------
export function Dialog({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog ref={ref} className="a-dialog" aria-labelledby={titleId} onClose={onClose}>
      {open && (
        <>
          <div className="a-dialog__head">
            <h2 id={titleId}>{title}</h2>
            <IconButton icon="x" label="Close" onClick={onClose} />
          </div>
          <div className="a-dialog__body">{children}</div>
        </>
      )}
    </dialog>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onClose }: { open: boolean; title: string; message: React.ReactNode; confirmLabel: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <Dialog title={title} open={open} onClose={onClose}>
      <p className="a-confirm-text">{message}</p>
      <div className="a-form-actions">
        <button type="button" className="btn a-btn-ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="btn a-btn-danger" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Form bits
// ---------------------------------------------------------------------------
export function Field({ label, error, hint, required, wide, children }: { label: string; error?: string; hint?: string; required?: boolean; wide?: boolean; children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => React.ReactNode }) {
  const id = useId();
  const noteId = `${id}-note`;
  return (
    <div className={`a-field ${wide ? "a-field--wide" : ""}`}>
      <label htmlFor={id}>{label}{required && <span className="a-required" aria-hidden="true"> *</span>}</label>
      {children({ id, "aria-invalid": !!error, "aria-describedby": error || hint ? noteId : undefined })}
      {error ? <p className="a-error" id={noteId}>{error}</p> : hint ? <p className="a-hint" id={noteId}>{hint}</p> : null}
    </div>
  );
}

export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="a-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function FormActions({ onCancel, submitLabel, error }: { onCancel: () => void; submitLabel: string; error?: string }) {
  return (
    <>
      {error && <p className="a-error a-error--form" role="alert">{error}</p>}
      <div className="a-form-actions">
        <button type="button" className="btn a-btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn--dark">{submitLabel}</button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
const ToastContext = createContext<(message: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = useCallback((text: string) => {
    setMessage(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(""), 4000);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={`a-toast ${message ? "is-visible" : ""}`} role="status" aria-live="polite">{message}</div>
    </ToastContext.Provider>
  );
}
