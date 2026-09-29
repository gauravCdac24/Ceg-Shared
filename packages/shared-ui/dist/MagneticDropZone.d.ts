import './MagneticDropZone.css';
export type MagneticDropZoneProps = {
    accept?: string;
    className?: string;
    disabled?: boolean;
    maxSize?: number;
    multiple?: boolean;
    /** When this value changes, selected files are cleared. */
    resetKey?: string | number;
    onFilesChange?: (files: File[]) => void;
};
export declare function MagneticDropZone({ accept, className, disabled, maxSize, multiple, resetKey, onFilesChange, }: MagneticDropZoneProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=MagneticDropZone.d.ts.map