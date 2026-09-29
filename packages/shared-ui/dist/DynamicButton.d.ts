import { type HTMLMotionProps } from "framer-motion";
import { type Key, type ReactNode } from "react";
import "./DynamicButton.css";
export type DynamicButtonVariant = "primary" | "secondary";
export type DynamicButtonProps = Omit<HTMLMotionProps<"button">, "animate" | "children" | "initial" | "ref" | "transition"> & {
    children: string;
    icon?: ReactNode;
    stateKey?: Key;
    variant?: DynamicButtonVariant;
    width?: "content" | "full";
};
export declare const DynamicButton: import("react").ForwardRefExoticComponent<Omit<HTMLMotionProps<"button">, "ref" | "animate" | "children" | "initial" | "transition"> & {
    children: string;
    icon?: ReactNode;
    stateKey?: Key;
    variant?: DynamicButtonVariant;
    width?: "content" | "full";
} & import("react").RefAttributes<HTMLButtonElement>>;
//# sourceMappingURL=DynamicButton.d.ts.map