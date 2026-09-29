import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type HTMLMotionProps,
} from "framer-motion";
import {
  forwardRef,
  type Key,
  type ReactNode,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import "./DynamicButton.css";

export type DynamicButtonVariant = "primary" | "secondary";

const uiEaseOut = [0.23, 1, 0.32, 1] as const;

export type DynamicButtonProps = Omit<
  HTMLMotionProps<"button">,
  "animate" | "children" | "initial" | "ref" | "transition"
> & {
  children: string;
  icon?: ReactNode;
  stateKey?: Key;
  variant?: DynamicButtonVariant;
  width?: "content" | "full";
};

function getButtonClassName({
  className,
  variant = "primary",
  width,
}: {
  className?: string;
  variant?: DynamicButtonVariant;
  width?: "content" | "full";
}) {
  return [
    "dynamic-btn",
    variant === "secondary" ? "dynamic-btn--secondary" : "dynamic-btn--primary",
    width === "full" ? "dynamic-btn--full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export const DynamicButton = forwardRef<HTMLButtonElement, DynamicButtonProps>(
  function DynamicButton(
    {
      children,
      className,
      icon,
      stateKey,
      type = "button",
      variant = "primary",
      width = "content",
      ...props
    },
    forwardedRef,
  ) {
    const shouldReduceMotion = useReducedMotion();
    const buttonRef = useRef<HTMLButtonElement>(null);
    const measureRef = useRef<HTMLSpanElement>(null);
    const measurementSignatureRef = useRef("");
    const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
    const iconKey = stateKey ?? children;
    const measurementSignature = [
      children,
      className,
      icon ? "icon" : "no-icon",
      stateKey,
      variant,
    ].join("\0");
    const shouldMeasureWidth = width === "content";
    const widthTransition = shouldReduceMotion
      ? { duration: 0 }
      : { bounce: 0, duration: 0.26, type: "spring" as const };
    const contentTransition = {
      duration: shouldReduceMotion ? 0.16 : 0.18,
      ease: uiEaseOut,
    };
    const contentVisible = { opacity: 1, transform: "translateY(0px)" };
    const contentInitial = shouldReduceMotion
      ? { opacity: 0, transform: "translateY(0px)" }
      : { opacity: 0, transform: "translateY(8px)" };
    const contentExit = shouldReduceMotion
      ? { opacity: 0, transform: "translateY(0px)" }
      : { opacity: 0, transform: "translateY(-8px)" };

    useImperativeHandle(forwardedRef, () => buttonRef.current as HTMLButtonElement);

    const syncWidth = useCallback(() => {
      const button = buttonRef.current;
      const measure = measureRef.current;

      if (!button || !measure || !shouldMeasureWidth) {
        return;
      }

      const styles = window.getComputedStyle(button);
      const horizontalPadding =
        Number.parseFloat(styles.paddingLeft) +
        Number.parseFloat(styles.paddingRight) +
        Number.parseFloat(styles.borderLeftWidth) +
        Number.parseFloat(styles.borderRightWidth);
      const nextWidth = Math.ceil(measure.scrollWidth + horizontalPadding);

      setMeasuredWidth((currentWidth) =>
        currentWidth === nextWidth ? currentWidth : nextWidth,
      );
    }, [shouldMeasureWidth]);

    useLayoutEffect(() => {
      const measure = measureRef.current;

      if (!measure || !shouldMeasureWidth) {
        setMeasuredWidth(null);
        return;
      }

      syncWidth();

      const observer = new ResizeObserver(syncWidth);
      observer.observe(measure);
      window.addEventListener("resize", syncWidth);

      return () => {
        observer.disconnect();
        window.removeEventListener("resize", syncWidth);
      };
    }, [shouldMeasureWidth, syncWidth]);

    useLayoutEffect(() => {
      if (measurementSignatureRef.current === measurementSignature) {
        return;
      }

      measurementSignatureRef.current = measurementSignature;
      syncWidth();
    }, [measurementSignature, syncWidth]);

    return (
      <motion.button
        {...props}
        animate={
          width === "content" ? { width: measuredWidth ?? "auto" } : undefined
        }
        className={getButtonClassName({ className, variant, width })}
        initial={false}
        ref={buttonRef}
        transition={width === "content" ? { width: widthTransition } : undefined}
        type={type}
      >
        <span className="relative inline-flex items-center gap-1.5">
          {icon ? (
            <span className="dynamic-btn__icon-slot">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  animate={contentVisible}
                  className="dynamic-btn__icon-layer"
                  exit={contentExit}
                  initial={contentInitial}
                  key={iconKey}
                  transition={contentTransition}
                >
                  {icon}
                </motion.span>
              </AnimatePresence>
            </span>
          ) : null}

          <span className="dynamic-btn__label-slot">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                animate={contentVisible}
                className="dynamic-btn__label-layer"
                exit={contentExit}
                initial={contentInitial}
                key={children}
                transition={contentTransition}
              >
                {children}
              </motion.span>
            </AnimatePresence>
          </span>
        </span>
        <span
          aria-hidden="true"
          className="dynamic-btn__measure"
          ref={measureRef}
        >
          {icon ? <span className="dynamic-btn__measure-icon">{icon}</span> : null}
          <span>{children}</span>
        </span>
      </motion.button>
    );
  },
);
