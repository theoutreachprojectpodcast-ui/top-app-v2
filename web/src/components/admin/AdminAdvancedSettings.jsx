"use client";

import { useId, useState } from "react";

/**
 * Collapsible advanced / technical settings.
 * @param {{
 *   title?: string,
 *   description?: string,
 *   warning?: string,
 *   defaultOpen?: boolean,
 *   children: import('react').ReactNode,
 * }} props
 */
export default function AdminAdvancedSettings({
  title = "Advanced settings",
  description = "Technical fields. Change only if you know what they do.",
  warning = "",
  defaultOpen = false,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <section className={`adminAdvancedSettings${open ? " isOpen" : ""}`}>
      <button
        type="button"
        className="adminAdvancedSettings__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="adminAdvancedSettings__toggleTitle">{title}</span>
        <span className="adminMuted">{open ? "Hide" : "Show"}</span>
      </button>
      {open ? (
        <div id={panelId} className="adminAdvancedSettings__body">
          {description ? <p className="adminMuted adminAdvancedSettings__desc">{description}</p> : null}
          {warning ? (
            <p className="adminAdvancedSettings__warning" role="status">
              {warning}
            </p>
          ) : null}
          <div className="adminAdvancedSettings__fields">{children}</div>
        </div>
      ) : null}
    </section>
  );
}
