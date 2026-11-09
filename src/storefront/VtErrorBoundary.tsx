import React from 'react';

type Props = { children: React.ReactNode };
type State = { error: any };

export default class VtErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: any) {
    return { error };
  }

  render() {
    if (this.state.error) {
      const detail = String(this.state.error?.stack || this.state.error?.message || this.state.error);
      return (
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="text-2xl font-semibold text-[color:var(--vt-chili)]">Something went wrong</h1>
          <p className="mt-2 text-sm text-[color:var(--vt-muted)]">
            The page hit an unexpected error. Please refresh — if it persists, contact staff.
          </p>
          <pre className="mt-6 overflow-x-auto rounded-2xl border border-[color:var(--vt-border)] bg-[color:var(--vt-card)] p-5 text-xs text-[color:var(--vt-muted)] whitespace-pre-wrap">
            {detail}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
