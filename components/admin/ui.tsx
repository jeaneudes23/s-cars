"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
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

export function SearchBox({ label, placeholder, value, onChange, count }: { label: string; placeholder: string; value: string; onChange: (value: string) => void; count: number }) {
  const id = useId();
  return (
    <div className="a-search">
      <label htmlFor={id} className="sr-only">{label}</label>
      <input id={id} className="a-input" type="search" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      {value.trim() && <p className="sr-only" role="status">{count} {count === 1 ? "result" : "results"}</p>}
    </div>
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

// A status badge that opens a small menu to change it.
export function StatusMenu<T extends string>({ label, text, tone, value, options, onChange }: { label: string; text: string; tone: Tone; value: T; options: { key: T; label: string }[]; onChange: (key: T) => void }) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const open = !!position;

  // Fixed to the window so a scrolling table can't cut the menu off.
  function toggle() {
    if (open) { setPosition(null); return; }
    const r = trigger.current!.getBoundingClientRect();
    const height = options.length * 44 + 8;
    setPosition({
      top: r.bottom + height + 8 > window.innerHeight ? Math.max(8, r.top - height - 4) : r.bottom + 4,
      left: Math.max(8, Math.min(r.left, window.innerWidth - 188)),
    });
  }

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
    const close = () => setPosition(null);
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!menu.current?.contains(target) && !trigger.current?.contains(target)) close();
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  function onKeyDown(e: React.KeyboardEvent) {
    const items = [...(menu.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Escape" || e.key === "Tab") {
      e.preventDefault();
      setPosition(null);
      trigger.current?.focus();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      items[(index + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
    }
  }

  return (
    <>
      <button ref={trigger} type="button" className={`a-badge a-badge--${tone} a-badge-btn`} aria-haspopup="menu" aria-expanded={open} aria-label={`${label}: ${text}. Change`} onClick={toggle}>
        <span className="a-badge__dot" aria-hidden="true" />{text}<Icon name="chevron" />
      </button>
      {position && (
        <div ref={menu} className="a-status-menu" role="menu" aria-label={label} style={position} onKeyDown={onKeyDown}>
          {options.map((o) => (
            <button key={o.key} type="button" role="menuitemradio" aria-checked={o.key === value} onClick={() => {
              setPosition(null);
              trigger.current?.focus();
              if (o.key !== value) onChange(o.key);
            }}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export const PAYMENT_OPTIONS: { key: "paid" | "unpaid"; label: string }[] = [{ key: "paid", label: "Paid" }, { key: "unpaid", label: "Unpaid" }];


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

export function IconButton({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return (
    <button type="button" className="a-icon-btn" aria-label={label} title={label} onClick={onClick}>
      <Icon name={icon} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Table. Becomes stacked cards on phones, using each column's label.
// ---------------------------------------------------------------------------
export type Column<T> = {
  label: string;
  render: (row: T) => React.ReactNode;
  align?: "right";
  hideLabel?: boolean;
  sort?: (row: T) => string | number; // numbers for money, YYYY-MM-DD strings for dates
};

type Sort = { label: string; direction: "asc" | "desc" };

const PAGE_SIZE = 25;

function SortArrows({ direction }: { direction?: Sort["direction"] }) {
  return (
    <svg className="a-sort-arrows" viewBox="0 0 10 16" aria-hidden="true">
      <path className={direction === "asc" ? "is-on" : ""} d="M5 1 9 6.5H1Z" />
      <path className={direction === "desc" ? "is-on" : ""} d="M5 15 1 9.5h8Z" />
    </svg>
  );
}

export function DataTable<T extends { id: string }>({ columns, rows, empty, caption }: { columns: Column<T>[]; rows: T[]; empty: React.ReactNode; caption: string }) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [sort, setSort] = useState<Sort | null>(null);
  const sortable = columns.filter((c) => c.sort);

  const sorted = useMemo(() => {
    const value = columns.find((c) => c.label === sort?.label)?.sort;
    if (!sort || !value) return rows;
    const order = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = value(a);
      const y = value(b);
      return (x < y ? -1 : x > y ? 1 : 0) * order;
    });
  }, [rows, columns, sort]);

  // Highest or newest first, then the reverse, then back to the page's own order.
  function toggle(label: string) {
    setSort((current) => {
      if (current?.label !== label) return { label, direction: "desc" };
      return current.direction === "desc" ? { label, direction: "asc" } : null;
    });
  }

  // Phones have no column headers, so they choose the order from a list.
  const sortChoices = sortable.flatMap((c) => {
    const isDate = typeof (rows[0] && c.sort!(rows[0])) === "string";
    return [
      { key: `${c.label}|desc`, label: `${c.label}: ${isDate ? "newest first" : "highest first"}` },
      { key: `${c.label}|asc`, label: `${c.label}: ${isDate ? "oldest first" : "lowest first"}` },
    ];
  });

  if (rows.length === 0) return <div className="a-empty">{empty}</div>;
  return (
    <>
      {sortable.length > 0 && (
        <label className="a-sort-mobile">
          <span>Sort by</span>
          <select className="a-input" value={sort ? `${sort.label}|${sort.direction}` : ""} onChange={(e) => {
            const [label, direction] = e.target.value.split("|");
            setSort(label ? { label, direction: direction as Sort["direction"] } : null);
          }}>
            <option value="">Default order</option>
            {sortChoices.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </label>
      )}
      <div className="a-table-scroll" tabIndex={0} role="region" aria-label={caption}>
        <table className="a-table">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((c) => {
                const direction = sort?.label === c.label ? sort.direction : undefined;
                return (
                  <th key={c.label} scope="col" className={c.align === "right" ? "is-right" : ""} aria-sort={c.sort ? (direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none") : undefined}>
                    {c.hideLabel ? <span className="sr-only">{c.label}</span> : c.sort ? (
                      <button type="button" className={`a-sort-btn ${direction ? "is-active" : ""}`} onClick={() => toggle(c.label)}>
                        {c.label}<SortArrows direction={direction} />
                      </button>
                    ) : c.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, limit).map((row) => (
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
    <dialog ref={ref} className="a-dialog" aria-labelledby={titleId} onCancel={(e) => { e.preventDefault(); onClose(); }}>
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

// Read-only details of one record.
export type DetailSection = { title: string; items: [string, React.ReactNode][] };

export function ViewDialog({ title, open, onClose, onEdit, sections, image }: { title: string; open: boolean; onClose: () => void; onEdit?: () => void; sections: DetailSection[]; image?: string }) {
  return (
    <Dialog title={title} open={open} onClose={onClose}>
      {image && <img className="a-details__image" src={image} alt="" />}
      <div className="a-details">
        {sections.map((section) => (
          <section key={section.title}>
            <h3>{section.title}</h3>
            <dl>
              {section.items.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value === undefined || value === null || value === "" ? "Not recorded" : value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <div className="a-form-actions a-details__actions">
        <button type="button" className={`btn ${onEdit ? "a-btn-ghost" : "btn--dark"}`} onClick={onClose}>Close</button>
        {onEdit && <button type="button" className="btn btn--dark" onClick={onEdit}>Edit</button>}
      </div>
    </Dialog>
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

export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="a-form-section">
      <legend>{title}</legend>
      <div className="a-form">{children}</div>
    </fieldset>
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

export function FormActions({ onCancel, onDelete, submitLabel, error }: { onCancel: () => void; onDelete?: () => void; submitLabel: string; error?: string }) {
  return (
    <>
      {error && <p className="a-error a-error--form" role="alert">{error}</p>}
      <div className="a-form-actions">
        {onDelete && <button type="button" className="btn a-btn-delete" onClick={onDelete}>Delete</button>}
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
  const [toast, setToast] = useState({ id: 0, text: "", visible: false });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = useCallback((text: string) => {
    setToast((t) => ({ id: t.id + 1, text, visible: true }));
    clearTimeout(timer.current);
    // Long enough to read: short confirmations leave quickly, longer warnings stay.
    timer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), Math.max(2000, text.length * 60));
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* Stays on the page so it can slide out; the text stays until it has gone. */}
      <div className={`a-toast ${toast.visible ? "is-visible" : ""}`} role="status" aria-live="polite">
        <span key={toast.id} className="a-toast__text">{toast.text}</span>
      </div>
    </ToastContext.Provider>
  );
}
