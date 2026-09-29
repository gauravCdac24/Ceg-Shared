import * as React from "react";
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
export declare function FleetStatusPage({ kind, title, description, homeHref, homeLabel, onGoBack, backLabel, children, }: FleetStatusPageProps): import("react/jsx-runtime").JSX.Element;
export declare function FleetNotFoundPage(props: Omit<FleetStatusPageProps, "kind">): import("react/jsx-runtime").JSX.Element;
export declare function FleetForbiddenPage(props: Omit<FleetStatusPageProps, "kind">): import("react/jsx-runtime").JSX.Element;
export declare function FleetServerErrorPage(props: Omit<FleetStatusPageProps, "kind">): import("react/jsx-runtime").JSX.Element;
export declare function FleetSessionExpiredPage(props: Omit<FleetStatusPageProps, "kind">): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=FleetStatusPage.d.ts.map