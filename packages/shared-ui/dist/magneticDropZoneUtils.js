export function formatBytes(bytes) {
    if (bytes === 0)
        return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / 1024 ** unitIndex;
    return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}
export function isFileDrag(dataTransfer) {
    return dataTransfer ? Array.from(dataTransfer.types).includes('Files') : false;
}
export function acceptsFile(file, accept) {
    if (!accept.trim())
        return true;
    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();
    return accept
        .split(',')
        .map((rule) => rule.trim().toLowerCase())
        .some((rule) => {
        if (rule.startsWith('.'))
            return fileName.endsWith(rule);
        if (rule.endsWith('/*'))
            return fileType.startsWith(rule.slice(0, -1));
        return fileType === rule;
    });
}
export function getFileIconKind(file) {
    if (file.type.startsWith('image/'))
        return 'image';
    if (file.type === 'application/pdf')
        return 'pdf';
    if (file.type.includes('zip') || file.name.toLowerCase().endsWith('.zip'))
        return 'zip';
    return 'generic';
}
//# sourceMappingURL=magneticDropZoneUtils.js.map