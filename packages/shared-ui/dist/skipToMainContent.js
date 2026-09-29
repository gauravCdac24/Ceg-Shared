/** Focus and scroll to #main-content, accounting for fixed public/admin chrome. */
function readCssPx(varName) {
    if (typeof document === "undefined")
        return 0;
    const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    const value = parseFloat(raw);
    return Number.isFinite(value) ? value : 0;
}
function findScrollContainer(el) {
    let node = el;
    while (node) {
        const { overflowY } = getComputedStyle(node);
        if ((overflowY === "auto" || overflowY === "scroll") &&
            node.scrollHeight > node.clientHeight + 1) {
            return node;
        }
        node = node.parentElement;
    }
    return null;
}
export function skipToMainContent(event, mainId = "main-content") {
    event?.preventDefault();
    const el = document.getElementById(mainId);
    if (!el)
        return;
    const scrollContainer = findScrollContainer(el);
    const chromeOffset = readCssPx("--ceg-public-chrome-offset") || readCssPx("--ceg-admin-top-offset") || 72;
    if (scrollContainer === el) {
        el.scrollTo({ top: 0, behavior: "smooth" });
    }
    else {
        const targetTop = el.getBoundingClientRect().top + window.scrollY - chromeOffset;
        window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
    }
    window.requestAnimationFrame(() => {
        if (!el.hasAttribute("tabindex"))
            el.setAttribute("tabindex", "-1");
        el.focus({ preventScroll: true });
    });
}
//# sourceMappingURL=skipToMainContent.js.map