"use client";

import { Component } from "react";
import { logClientDiagnosticError } from "@/lib/runtime/clientDiagnostics";

/**
 * Catches render failures so supported browsers do not show a blank page.
 */
export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    logClientDiagnosticError("app_error_boundary", error, {
      componentStack: String(info?.componentStack || "").slice(0, 500),
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="appShell" style={{ padding: "24px", maxWidth: 520, margin: "0 auto" }}>
          <h1 style={{ fontSize: "1.25rem", marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: "var(--color-text-secondary, #555)", marginBottom: 16 }}>
            The page could not finish loading. Try refreshing. If this keeps happening, open the app
            in the latest Chrome, Safari, Edge, or Firefox.
          </p>
          <button type="button" className="btnPrimary" onClick={() => window.location.reload()}>
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
