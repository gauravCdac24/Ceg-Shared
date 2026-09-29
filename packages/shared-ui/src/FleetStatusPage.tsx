import * as React from "react";
import { Button } from "./Button";
import "./FleetStatusPage.css";

export type FleetStatusKind = "not-found" | "forbidden" | "server-error" | "session-expired";

export type FleetStatusPageProps = {
  kind: FleetStatusKind;
  title?: string;
  description?: string;
  homeHref?: string;
  homeLabel?: string;
  onGoBack?: () => void;
  backLabel?: string;
  children?: React.ReactNode;
};

const DEFAULTS: Record<
  FleetStatusKind,
  { code: string; title: string; description: string }
> = {
  "not-found": {
    code: "404",
    title: "Page not found",
    description: "The page you're looking for doesn't exist or has been moved.",
  },
  forbidden: {
    code: "403",
    title: "Access denied",
    description: "You don't have permission to view this page.",
  },
  "server-error": {
    code: "500",
    title: "Something went wrong",
    description: "We're having trouble loading this page. Please try again in a moment.",
  },
  "session-expired": {
    code: "401",
    title: "Session expired",
    description: "Your session has ended. Sign in again to continue.",
  },
};

export function FleetStatusPage({
  kind,
  title,
  description,
  homeHref = "/",
  homeLabel = "Back to home",
  onGoBack,
  backLabel = "Go back",
  children,
}: FleetStatusPageProps) {
  const preset = DEFAULTS[kind];
  const heading = title ?? preset.title;
  const body = description ?? preset.description;

  return (
    <main className="ceg-fleet-status" role="main">
      <p className="ceg-fleet-status__code" aria-hidden>
        {preset.code}
      </p>
      <h1 className="ceg-fleet-status__title">{heading}</h1>
      <p className="ceg-fleet-status__description">{body}</p>
      <div className="ceg-fleet-status__actions">
        {homeHref ? (
          <a className="ceg-btn ceg-btn--primary" href={homeHref}>
            {homeLabel}
          </a>
        ) : null}
        {onGoBack ? (
          <Button variant="secondary" type="button" onClick={onGoBack}>
            {backLabel}
          </Button>
        ) : null}
        {children}
      </div>
    </main>
  );
}

export function FleetNotFoundPage(props: Omit<FleetStatusPageProps, "kind">) {
  return <FleetStatusPage kind="not-found" {...props} />;
}

export function FleetForbiddenPage(props: Omit<FleetStatusPageProps, "kind">) {
  return <FleetStatusPage kind="forbidden" {...props} />;
}

export function FleetServerErrorPage(props: Omit<FleetStatusPageProps, "kind">) {
  return <FleetStatusPage kind="server-error" {...props} />;
}

export function FleetSessionExpiredPage(props: Omit<FleetStatusPageProps, "kind">) {
  return <FleetStatusPage kind="session-expired" {...props} />;
}
