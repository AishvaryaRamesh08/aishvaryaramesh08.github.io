import { Component, type CSSProperties, type ReactNode } from "react";
import { ui } from "../data/ui";
import { Button } from "./Button";

export interface ChunkErrorBoundaryProps {
  children: ReactNode;
  /** Called by Retry before the boundary re-renders its children (e.g. to re-create a lazy import). */
  onRetry?: () => void;
  /** Error text; defaults to "This section couldn't be loaded." */
  message?: string;
  /** Keeps the reserved box while the error is shown. */
  minHeight?: string;
  /** Replaces the default error view. */
  fallback?: (retry: () => void) => ReactNode;
}

interface State {
  failed: boolean;
}

/**
 * Catches a failed lazy chunk (or any render error) in its subtree and shows an error message with
 * a Retry control in its place; everything outside the boundary stays rendered and interactive
 * (Req 30.9).
 */
export class ChunkErrorBoundary extends Component<ChunkErrorBoundaryProps, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  private retry = (): void => {
    this.props.onRetry?.();
    this.setState({ failed: false });
  };

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.retry);
    const style: CSSProperties = { minHeight: this.props.minHeight };
    return (
      <div
        role="alert"
        style={style}
        className="flex flex-col items-center justify-center gap-4 rounded-card border border-border bg-surface p-6 text-center text-text"
      >
        <p>{this.props.message ?? ui.sectionLoadError}</p>
        <Button variant="secondary" onClick={this.retry}>
          {ui.retry}
        </Button>
      </div>
    );
  }
}
