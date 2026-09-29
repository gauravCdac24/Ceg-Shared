import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState, } from 'react';
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, } from 'framer-motion';
import { acceptsFile, formatBytes, getFileIconKind, isFileDrag } from './magneticDropZoneUtils';
import './MagneticDropZone.css';
const MAGNET_DISTANCE = 180;
const MAX_MAGNET_OFFSET = 10;
const MAGNET_SPRING = { damping: 24, mass: 0.65, stiffness: 280 };
function IconImage() {
    return (_jsx("svg", { width: "23", height: "23", viewBox: "0 0 256 256", fill: "currentColor", "aria-hidden": "true", children: _jsx("path", { d: "M216 40H40a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16Zm0 160H40V56h176v144ZM80 96a16 16 0 1 0 16 16 16 16 0 0 0-16-16Zm120 72l-32-42.67A8 8 0 0 0 168 128H88a8 8 0 0 0-6.4 3.2L56 176h136Z" }) }));
}
function IconPdf() {
    return (_jsx("svg", { width: "23", height: "23", viewBox: "0 0 256 256", fill: "currentColor", "aria-hidden": "true", children: _jsx("path", { d: "M208 32h-56l-16-16H48a16 16 0 0 0-16 16v176a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16Zm-80 128h-8v32h-16v-80h24a20 20 0 0 1 0 40Zm-8-24h8a8 8 0 0 0 0-16h-8v16Zm56 24a20 20 0 0 1-20 20h-4v-12h4a8 8 0 0 0 0-16h-4v-12h4a20 20 0 0 1 0 40Z" }) }));
}
function IconZip() {
    return (_jsx("svg", { width: "23", height: "23", viewBox: "0 0 256 256", fill: "currentColor", "aria-hidden": "true", children: _jsx("path", { d: "M208 32h-56l-16-16H48a16 16 0 0 0-16 16v176a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16Zm-32 80h-16v16h16v16h-16v16h16v16h-16v16h16v16h-16v-16h-16v-16h16v-16h-16v-16h16v-16h-16v-16h16v-16Z" }) }));
}
function IconFile() {
    return (_jsx("svg", { width: "23", height: "23", viewBox: "0 0 256 256", fill: "currentColor", "aria-hidden": "true", children: _jsx("path", { d: "M213.66 82.34l-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v176a16 16 0 0 0 16 16h144a16 16 0 0 0 16-16V88a8 8 0 0 0-2.34-5.66ZM160 51.31L188.69 80H160ZM200 216H56V40h88v48a8 8 0 0 0 8 8h48Z" }) }));
}
function IconUpload() {
    return (_jsx("svg", { width: "23", height: "23", viewBox: "0 0 256 256", fill: "currentColor", "aria-hidden": "true", children: _jsx("path", { d: "M213.66 82.34l-56-56A8 8 0 0 0 152 24H56a16 16 0 0 0-16 16v176a16 16 0 0 0 16 16h144a16 16 0 0 0 16-16V88a8 8 0 0 0-2.34-5.66ZM160 51.31L188.69 80H160ZM200 216H56V40h88v48a8 8 0 0 0 8 8h48v120Zm-40-72a8 8 0 0 1-8 8h-24v56a8 8 0 0 1-16 0v-56h-24a8 8 0 0 1 0-16h56a8 8 0 0 1 8 8Z" }) }));
}
function IconCheck() {
    return (_jsx("svg", { width: "15", height: "15", viewBox: "0 0 256 256", fill: "currentColor", "aria-hidden": "true", children: _jsx("path", { d: "M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24Zm45.66 85.66-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L116 148.69l50.34-50.35a8 8 0 0 1 11.32 11.32Z" }) }));
}
function FileTypeIcon({ kind }) {
    if (kind === 'image')
        return _jsx(IconImage, {});
    if (kind === 'pdf')
        return _jsx(IconPdf, {});
    if (kind === 'zip')
        return _jsx(IconZip, {});
    return _jsx(IconFile, {});
}
function cn(...parts) {
    return parts.filter(Boolean).join(' ');
}
export function MagneticDropZone({ accept = 'image/*,.pdf,.zip', className, disabled = false, maxSize = 20 * 1024 * 1024, multiple = false, resetKey, onFilesChange, }) {
    const inputRef = useRef(null);
    const zoneRef = useRef(null);
    const [files, setFiles] = useState([]);
    const [isNear, setIsNear] = useState(false);
    const [isOver, setIsOver] = useState(false);
    const [error, setError] = useState(null);
    const shouldReduceMotion = useReducedMotion();
    const magnetX = useMotionValue(0);
    const magnetY = useMotionValue(0);
    const magnetScale = useMotionValue(1);
    const glowX = useMotionValue(0);
    const glowY = useMotionValue(0);
    const springX = useSpring(magnetX, MAGNET_SPRING);
    const springY = useSpring(magnetY, MAGNET_SPRING);
    const springScale = useSpring(magnetScale, MAGNET_SPRING);
    const springGlowX = useSpring(glowX, MAGNET_SPRING);
    const springGlowY = useSpring(glowY, MAGNET_SPRING);
    const transform = useMotionTemplate `translate3d(${springX}px, ${springY}px, 0) scale(${springScale})`;
    const glowTransform = useMotionTemplate `translate3d(${springGlowX}px, ${springGlowY}px, 0)`;
    const clearFiles = useCallback(() => {
        setFiles([]);
        setError(null);
        onFilesChange?.([]);
    }, [onFilesChange]);
    const resetMagnet = useCallback(() => {
        magnetX.set(0);
        magnetY.set(0);
        magnetScale.set(1);
        glowX.set(0);
        glowY.set(0);
        setIsNear(false);
        setIsOver(false);
    }, [glowX, glowY, magnetScale, magnetX, magnetY]);
    useEffect(() => {
        if (resetKey === undefined)
            return;
        clearFiles();
    }, [resetKey, clearFiles]);
    useEffect(() => {
        if (disabled) {
            resetMagnet();
            return undefined;
        }
        function handleWindowDragOver(event) {
            if (!isFileDrag(event.dataTransfer))
                return;
            const zone = zoneRef.current;
            if (!zone)
                return;
            const rect = zone.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const distanceFromEdgeX = Math.max(Math.abs(event.clientX - centerX) - rect.width / 2, 0);
            const distanceFromEdgeY = Math.max(Math.abs(event.clientY - centerY) - rect.height / 2, 0);
            const distance = Math.hypot(distanceFromEdgeX, distanceFromEdgeY);
            const pointerIsOver = event.clientX >= rect.left &&
                event.clientX <= rect.right &&
                event.clientY >= rect.top &&
                event.clientY <= rect.bottom;
            const proximity = Math.max(0, 1 - distance / MAGNET_DISTANCE);
            if (proximity === 0) {
                resetMagnet();
                return;
            }
            const deltaX = event.clientX - centerX;
            const deltaY = event.clientY - centerY;
            const pointerDistance = Math.max(Math.hypot(deltaX, deltaY), 1);
            const offset = pointerIsOver ? 0 : proximity * MAX_MAGNET_OFFSET;
            magnetX.set(shouldReduceMotion ? 0 : (deltaX / pointerDistance) * offset);
            magnetY.set(shouldReduceMotion ? 0 : (deltaY / pointerDistance) * offset);
            magnetScale.set(shouldReduceMotion ? 1 : pointerIsOver ? 1.025 : 1.01);
            glowX.set(shouldReduceMotion ? 0 : deltaX);
            glowY.set(shouldReduceMotion ? 0 : deltaY);
            setIsNear(true);
            setIsOver(pointerIsOver);
        }
        function handleDragEnd() {
            resetMagnet();
        }
        window.addEventListener('dragover', handleWindowDragOver);
        window.addEventListener('dragend', handleDragEnd);
        window.addEventListener('drop', handleDragEnd);
        return () => {
            window.removeEventListener('dragover', handleWindowDragOver);
            window.removeEventListener('dragend', handleDragEnd);
            window.removeEventListener('drop', handleDragEnd);
        };
    }, [glowX, glowY, magnetScale, magnetX, magnetY, resetMagnet, shouldReduceMotion, disabled]);
    const acceptFiles = useCallback((incomingFiles) => {
        if (disabled)
            return;
        const nextFiles = multiple ? incomingFiles : incomingFiles.slice(0, 1);
        const unsupportedFile = nextFiles.find((file) => !acceptsFile(file, accept));
        const oversizedFile = nextFiles.find((file) => file.size > maxSize);
        if (unsupportedFile) {
            setFiles([]);
            setError(`${unsupportedFile.name} is not a supported file type.`);
            onFilesChange?.([]);
            return;
        }
        if (oversizedFile) {
            setFiles([]);
            setError(`${oversizedFile.name} is larger than ${formatBytes(maxSize)}.`);
            onFilesChange?.([]);
            return;
        }
        if (nextFiles.length === 0)
            return;
        setFiles(nextFiles);
        setError(null);
        onFilesChange?.(nextFiles);
    }, [accept, disabled, maxSize, multiple, onFilesChange]);
    function handleDrop(event) {
        if (disabled)
            return;
        event.preventDefault();
        event.stopPropagation();
        acceptFiles(Array.from(event.dataTransfer.files));
        resetMagnet();
    }
    function handleDragOver(event) {
        if (disabled || !isFileDrag(event.dataTransfer))
            return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }
    function handleInputChange(event) {
        acceptFiles(Array.from(event.target.files ?? []));
        event.target.value = '';
    }
    function openFilePicker() {
        if (!disabled)
            inputRef.current?.click();
    }
    const firstFile = files[0];
    const title = isOver ? 'Let go to add it' : isNear ? 'Bring it closer' : 'Drop a file here';
    return (_jsxs(motion.div, { ref: zoneRef, className: cn('magnetic-drop-zone', isOver && 'magnetic-drop-zone--over', isNear && !isOver && 'magnetic-drop-zone--near', disabled && 'magnetic-drop-zone--disabled', className), style: { transform: shouldReduceMotion || disabled ? undefined : transform }, onDragOver: handleDragOver, onDrop: handleDrop, children: [_jsx("input", { ref: inputRef, type: "file", className: "magnetic-drop-zone__input", accept: accept, multiple: multiple, disabled: disabled, onChange: handleInputChange }), _jsx(motion.div, { "aria-hidden": "true", className: cn('magnetic-drop-zone__glow', isNear && 'magnetic-drop-zone__glow--visible'), style: { transform: glowTransform } }), firstFile ? (_jsxs("div", { className: "magnetic-drop-zone__selected", children: [_jsx("div", { className: "magnetic-drop-zone__file-icon", children: _jsx(FileTypeIcon, { kind: getFileIconKind(firstFile) }) }), _jsxs("div", { className: "magnetic-drop-zone__ready", children: [_jsx(IconCheck, {}), _jsx("p", { children: files.length === 1 ? 'Ready to upload' : `${files.length} files ready` })] }), _jsxs("p", { className: "magnetic-drop-zone__filename", children: [firstFile.name, files.length > 1 ? ` +${files.length - 1}` : ''] }), _jsx("p", { className: "magnetic-drop-zone__filesize", children: formatBytes(firstFile.size) }), _jsxs("div", { className: "magnetic-drop-zone__actions", children: [_jsx("button", { type: "button", className: "magnetic-drop-zone__btn", onClick: openFilePicker, disabled: disabled, children: "Replace" }), _jsx("button", { type: "button", className: "magnetic-drop-zone__btn", onClick: clearFiles, disabled: disabled, "aria-label": `Remove ${firstFile.name}`, children: "Remove" })] })] })) : (_jsxs("button", { type: "button", className: "magnetic-drop-zone__picker", onClick: openFilePicker, disabled: disabled, children: [_jsx("div", { className: cn('magnetic-drop-zone__upload-icon', isOver && 'magnetic-drop-zone__upload-icon--over'), children: _jsx(IconUpload, {}) }), _jsx("p", { className: "magnetic-drop-zone__title", children: title }), _jsxs("p", { className: "magnetic-drop-zone__hint", children: ["or click to browse \u00B7 up to ", formatBytes(maxSize)] })] })), error ? (_jsx("p", { className: "magnetic-drop-zone__error", "aria-live": "polite", children: error })) : null] }));
}
//# sourceMappingURL=MagneticDropZone.js.map