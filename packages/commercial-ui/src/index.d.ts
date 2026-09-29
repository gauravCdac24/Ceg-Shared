import type { ReactNode } from "react";

export function isQuotaLimitError(error: unknown): boolean;
export function isMarkedQuotaLimitError(error: unknown): boolean;
export function markQuotaLimitError(error: unknown): unknown;
export function resolveQuotaCopy(product: string, error: unknown): Record<string, string>;
export function maybeShowQuotaLimitToast(options: {
  product: string;
  error: unknown;
  upgradePath?: string;
  present?: (render: () => ReactNode) => string | number;
  dismiss?: (id: string | number) => void;
  [key: string]: unknown;
}): boolean;

export function UpgradeWall(props: Record<string, unknown>): ReactNode;
export function PricingTable(props: Record<string, unknown>): ReactNode;
export function BillingPortalLink(props: Record<string, unknown>): ReactNode;
