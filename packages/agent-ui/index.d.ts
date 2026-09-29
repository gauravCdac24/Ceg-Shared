import type { ComponentType, ReactNode } from "react";

export type AgentPanelProps = {
  streamUrl: string;
  className?: string;
  title?: string;
  placeholder?: string;
  emptyState?: ReactNode;
  /** Generic SSE passthrough — consumer ignores unknown events. */
  onEvent?: (ev: { event?: string; [key: string]: unknown }) => void;
  [key: string]: unknown;
};

export const AgentPanel: ComponentType<AgentPanelProps>;

export type AgentFabProps = {
  onClick?: () => void;
  open?: boolean;
  label?: string;
  [key: string]: unknown;
};
export const AgentFab: ComponentType<AgentFabProps>;

export function useAgentStream(url: string, options?: Record<string, unknown>): unknown;

export type AgentCapabilitiesAdminProps = {
  apiBase?: string;
  className?: string;
  showHeader?: boolean;
  requestFn?: (method: string, path: string, body?: unknown) => Promise<unknown>;
  [key: string]: unknown;
};
export const AgentCapabilitiesAdmin: ComponentType<AgentCapabilitiesAdminProps>;
