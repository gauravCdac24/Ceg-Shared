import React, { createContext, useContext } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from './utils/cn.js';

export const RECEIPT_PRINTER_STAGES = ['processing', 'printing', 'complete'];
export const RECEIPT_FEED_MOTIONS = ['smooth', 'stepped'];

const ReceiptPrinterContext = createContext(null);

const easeOut = [0.23, 1, 0.32, 1];
const easeInOut = [0.77, 0, 0.175, 1];

const receiptToothCount = 40;
const receiptToothDepth = 4;
const receiptToothPoints = Array.from({ length: receiptToothCount * 2 }, (_, index) => {
  const x = 100 - ((index + 1) * 100) / (receiptToothCount * 2);
  const y = index % 2 === 0 ? '100%' : `calc(100% - ${receiptToothDepth}px)`;
  return `${x}% ${y}`;
}).join(', ');
const receiptClipPath = `polygon(0 0, 100% 0, 100% calc(100% - ${receiptToothDepth}px), ${receiptToothPoints})`;

const printingTransformKeyframes = [
  'translateY(calc(-100% + 2px))',
  'translateY(-91%)',
  'translateY(-91%)',
  'translateY(-81%)',
  'translateY(-81%)',
  'translateY(-70%)',
  'translateY(-70%)',
  'translateY(-58%)',
  'translateY(-58%)',
  'translateY(-45%)',
  'translateY(-45%)',
  'translateY(-32%)',
  'translateY(-32%)',
  'translateY(-20%)',
  'translateY(-20%)',
  'translateY(-10%)',
  'translateY(-10%)',
  'translateY(-3%)',
  'translateY(-3%)',
  'translateY(0%)',
];

const printingKeyframeTimes = [
  0, 0.075, 0.105, 0.18, 0.21, 0.285, 0.315, 0.39, 0.42, 0.495, 0.525, 0.6, 0.63, 0.705, 0.735,
  0.81, 0.84, 0.915, 0.945, 1,
];

const defaultStatusLabels = {
  processing: 'Processing your order',
  printing: 'Printing your receipt',
  complete: 'Order complete',
};

function useReceiptPrinter(component) {
  const context = useContext(ReceiptPrinterContext);
  if (!context) {
    throw new Error(`${component} must be used inside ReceiptPrinter.Root.`);
  }
  return context;
}

function SpinnerIcon({ className }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 256 256"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M128 24a12 12 0 0 1 12 12v40a12 12 0 0 1-24 0V36a12 12 0 0 1 12-12Zm0 168a12 12 0 0 1 12 12v40a12 12 0 0 1-24 0V204a12 12 0 0 1 12-12Zm108-60a12 12 0 0 1-12 12h-40a12 12 0 0 1 0-24h40a12 12 0 0 1 12 12ZM60 128a12 12 0 0 1-12 12H12a12 12 0 0 1 0-24h40a12 12 0 0 1 12 12Zm172.3-67.7a12 12 0 0 1 0 17l-28.3 28.3a12 12 0 0 1-17-17l28.3-28.3a12 12 0 0 1 17 0ZM89 187a12 12 0 0 1-17 0l-28.3-28.3a12 12 0 0 1 17-17l28.3 28.3a12 12 0 0 1 0 17Zm118.3 0a12 12 0 0 1 0-17l28.3-28.3a12 12 0 0 1 17 17l-28.3 28.3a12 12 0 0 1-17 0ZM72 89a12 12 0 0 1-17 0L36.7 60.7a12 12 0 0 1 17-17L72 55.7a12 12 0 0 1 0 17Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 256 256" fill="none" aria-hidden="true">
      <path
        d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24Zm45.66 85.66-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L116 148.69l50.34-50.35a8 8 0 0 1 11.32 11.32Z"
        fill="currentColor"
      />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path
        d="M218.83 103.77l-80-75.48a1 1 0 0 1-.33-.21 11 11 0 0 0-11.32 0l-80 75.48A8 8 0 0 0 32 104v104a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8v-56h32v56a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8V104a8 8 0 0 0-2.17-5.23ZM208 200h-48v-56a8 8 0 0 0-8-8h-48a8 8 0 0 0-8 8v56H48v-96l80-75.39 80 75.39Z"
      />
    </svg>
  );
}

function StatusIndicator({ animate, move, stage }) {
  const isComplete = stage === 'complete';

  return (
    <span className="receipt-printer-status-icon" aria-hidden="true">
      <AnimatePresence initial={false} mode="sync">
        {isComplete ? (
          <motion.span
            key="complete"
            className="receipt-printer-status-icon-layer receipt-printer-status-icon-layer--success"
            initial={{ opacity: animate ? 0 : 1, scale: move ? 0.94 : 1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: animate ? 0 : 1, scale: move ? 0.96 : 1 }}
            transition={{ duration: animate ? 0.16 : 0, ease: easeOut }}
          >
            <CheckIcon />
          </motion.span>
        ) : (
          <motion.span
            key="working"
            className="receipt-printer-status-icon-layer"
            initial={{ opacity: animate ? 0 : 1, scale: move ? 0.94 : 1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: animate ? 0 : 1, scale: move ? 0.96 : 1 }}
            transition={{ duration: animate ? 0.16 : 0, ease: easeOut }}
          >
            <SpinnerIcon className={cn(animate && 'receipt-printer-spinner')} />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

function ReceiptPrinterRoot({
  'aria-label': ariaLabel = 'Receipt printer',
  animate = true,
  children,
  className,
  feedMotion = 'stepped',
  stage,
  statusLabels = defaultStatusLabels,
  ...props
}) {
  const shouldReduceMotion = useReducedMotion();
  const context = {
    animate,
    feedMotion,
    shouldMove: animate && !shouldReduceMotion,
    stage,
    statusLabels,
  };

  return (
    <ReceiptPrinterContext.Provider value={context}>
      <section
        aria-label={ariaLabel}
        className={cn('receipt-printer-root', className)}
        data-stage={stage}
        {...props}
      >
        {children}
      </section>
    </ReceiptPrinterContext.Provider>
  );
}

function ReceiptPrinterMachine({ children, className, ...props }) {
  return (
    <div className={cn('receipt-printer-machine', className)} {...props}>
      {children}
      <div className="receipt-printer-slot" aria-hidden="true" />
    </div>
  );
}

function ReceiptPrinterHeader({ children, className, ...props }) {
  return (
    <div className={cn('receipt-printer-header', className)} {...props}>
      {children}
    </div>
  );
}

function ReceiptPrinterScreen({ children, className, ...props }) {
  return (
    <div className={cn('receipt-printer-screen', className)} {...props}>
      <div className="receipt-printer-screen-inner">{children}</div>
    </div>
  );
}

function ReceiptPrinterStatus({ children, className, ...props }) {
  const { animate, shouldMove, stage, statusLabels } = useReceiptPrinter('ReceiptPrinter.Status');
  const label = children ?? statusLabels[stage] ?? defaultStatusLabels[stage];

  return (
    <div className={cn('receipt-printer-status', className)} {...props}>
      <StatusIndicator animate={animate} move={shouldMove} stage={stage} />
      <div className="receipt-printer-status-text" aria-live="polite" role="status">
        <AnimatePresence initial={false} mode="sync">
          <motion.div
            key={stage}
            className="receipt-printer-status-label"
            initial={{
              opacity: animate ? 0 : 1,
              y: shouldMove ? 4 : 0,
            }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: animate ? 0 : 1, y: shouldMove ? -4 : 0 }}
            transition={{ duration: animate ? 0.18 : 0, ease: easeOut }}
          >
            {label}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function ReceiptPrinterPaper({ children, className, style, ...props }) {
  return (
    <article
      className={cn('receipt-printer-paper', className)}
      style={{ clipPath: receiptClipPath, ...style }}
      {...props}
    >
      {children}
    </article>
  );
}

function ReceiptPrinterOutput({ children, className, ...props }) {
  const { animate, feedMotion, shouldMove, stage } = useReceiptPrinter('ReceiptPrinter.Output');
  const isReceiptVisible = stage !== 'processing';
  const shouldUseSteppedFeed =
    feedMotion === 'stepped' && stage === 'printing' && shouldMove;

  return (
    <div className={cn('receipt-printer-output', className)} {...props}>
      {isReceiptVisible ? <div className="receipt-printer-output-shadow" aria-hidden="true" /> : null}
      <motion.div
        className="receipt-printer-output-track"
        aria-hidden={stage !== 'complete'}
        initial={false}
        animate={{
          opacity: isReceiptVisible ? 1 : 0,
          transform:
            stage === 'printing' && shouldMove
              ? shouldUseSteppedFeed
                ? printingTransformKeyframes
                : 'translateY(0%)'
              : isReceiptVisible || !shouldMove
                ? 'translateY(0%)'
                : 'translateY(calc(-100% + 2px))',
        }}
        transition={{
          opacity: { duration: animate ? 0.16 : 0, ease: easeOut },
          transform: {
            duration: shouldMove ? 1.75 : 0,
            ease: shouldUseSteppedFeed ? 'linear' : easeInOut,
            times: shouldUseSteppedFeed ? printingKeyframeTimes : undefined,
          },
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/** Compact home link for the printer header. */
function ReceiptPrinterHomeLink({ href = '/', children = 'Home', className }) {
  return (
    <a className={cn('receipt-printer-home-link', className)} href={href}>
      <HomeIcon />
      <span>{children}</span>
    </a>
  );
}

export const ReceiptPrinter = {
  Header: ReceiptPrinterHeader,
  HomeLink: ReceiptPrinterHomeLink,
  Machine: ReceiptPrinterMachine,
  Output: ReceiptPrinterOutput,
  Paper: ReceiptPrinterPaper,
  Root: ReceiptPrinterRoot,
  Screen: ReceiptPrinterScreen,
  Status: ReceiptPrinterStatus,
};
