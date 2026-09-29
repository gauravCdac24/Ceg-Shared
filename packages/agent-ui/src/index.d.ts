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

/** Parse one SSE chunk from a streaming buffer. Returns events + remainder. */
export function parseSseChunk(buffer: string): {
  events: Array<{ event?: string; data?: string; [key: string]: unknown }>;
  rest: string;
};

export type AgentCapabilitiesAdminProps = {
  apiBase?: string;
  className?: string;
  showHeader?: boolean;
  requestFn?: (method: string, path: string, body?: unknown) => Promise<unknown>;
  [key: string]: unknown;
};
export const AgentCapabilitiesAdmin: ComponentType<AgentCapabilitiesAdminProps>;

// Sprint 1: Artifact + StepEvent components
export type ArtifactType =
  | 'quiz'
  | 'certificate'
  | 'event'
  | 'digest'
  | 'landing_page'
  | 'document'
  | 'image'
  | 'code';

export interface ArtifactResponse {
  artifact_id: string;
  artifact_type: ArtifactType;
  title: string;
  preview_url?: string;
  download_url?: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type ArtifactCardProps = {
  artifact: ArtifactResponse;
  onEdit?: () => void;
  onShare?: () => void;
};
export const ArtifactCard: ComponentType<ArtifactCardProps>;

export interface StepEvent {
  step_id: string;
  step_name: string;
  tool_called?: string;
  status: 'running' | 'done' | 'failed' | 'waiting_approval';
  started_at: string;
  ended_at?: string;
  result_summary?: string;
}

export type StepEventStreamProps = {
  jobId: string;
  streamUrl?: string;
  onComplete?: (artifacts: unknown[]) => void;
  onApprovalRequired?: (jobId: string, payload: unknown) => void;
};
export const StepEventStream: ComponentType<StepEventStreamProps>;

export type UseAnimatedTextOptions = {
  enabled?: boolean;
  msPerChar?: number;
};
export function useAnimatedText(text: string, options?: UseAnimatedTextOptions): string;

export type AgentChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export type AgentChatPanelProps = {
  productName: string;
  userName?: string;
  suggestedPrompts?: string[];
  messages?: AgentChatMessage[];
  streamingText?: string;
  isStreaming?: boolean;
  disabled?: boolean;
  placeholder?: string;
  onSendMessage: (text: string) => void | Promise<void>;
  onSuggestedPrompt?: (text: string) => void;
  className?: string;
};
export const AgentChatPanel: ComponentType<AgentChatPanelProps>;

export type GenerationStep = {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'failed';
};

export type GenerationProgressProps = {
  title?: string;
  steps: GenerationStep[];
  progress?: number;
  className?: string;
};
export const GenerationProgress: ComponentType<GenerationProgressProps>;
