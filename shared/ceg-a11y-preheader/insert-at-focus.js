/**
 * Insert text into the currently focused editable field (input, textarea, contenteditable).
 * Remembers the last editable so on-screen keyboard keys (which steal focus briefly)
 * still type into the prior field — including Fabric.js `textarea[data-fabric="textarea"]`.
 */

/** Matches CeG input sync — keep aligned with CEG_EDITABLE_INPUT_SELECTOR in index.js */
export const EDITABLE_SELECTOR =
  'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="range"]):not([type="date"]):not([type="datetime-local"]):not([type="time"]):not([type="number"]):not([type="color"]):not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly]), [contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"], [role="textbox"]';

/** @type {HTMLElement | null} */
let lastEditable = null;

/** @type {((action: string) => boolean) | null} */
let fabricTextInsertHandler = null;

/**
 * Optional host bridge (e.g. Cert Studio Fabric canvas): enterEditing + insert when
 * a text object is selected but not yet editing.
 * @param {((action: string) => boolean) | null} fn
 */
export function registerFabricTextInsertHandler(fn) {
  fabricTextInsertHandler = typeof fn === 'function' ? fn : null;
}

function rememberEditable(el) {
  if (el instanceof HTMLElement) lastEditable = el;
}

/** Install once — tracks last focused editable for VK after blur. */
function ensureFocusTracker() {
  if (typeof document === 'undefined' || ensureFocusTracker.installed) return;
  ensureFocusTracker.installed = true;
  document.addEventListener(
    'focusin',
    (e) => {
      const resolved = resolveEditableElement(e.target);
      if (resolved) rememberEditable(resolved);
    },
    true,
  );
}
ensureFocusTracker.installed = false;

/**
 * @param {EventTarget | null | undefined} target
 * @returns {HTMLElement | null}
 */
export function resolveEditableElement(target) {
  if (!(target instanceof HTMLElement)) return null;
  if (target.closest('.monaco-editor, .cm-editor, .cm-content')) return null;
  if (target.matches(EDITABLE_SELECTOR)) return target;
  const nested = target.closest(EDITABLE_SELECTOR);
  return nested instanceof HTMLElement ? nested : null;
}

/** @returns {HTMLElement | null} */
export function getFocusedEditable() {
  if (typeof document === 'undefined') return null;
  ensureFocusTracker();
  return resolveEditableElement(document.activeElement);
}

/**
 * Prefer live focus, then last remembered field, then Fabric hidden textarea.
 * @returns {HTMLElement | null}
 */
function resolveInsertTarget() {
  ensureFocusTracker();
  const focused = getFocusedEditable();
  if (focused) {
    rememberEditable(focused);
    return focused;
  }
  if (lastEditable?.isConnected && resolveEditableElement(lastEditable)) {
    return lastEditable;
  }
  if (typeof document !== 'undefined') {
    const fabricTa = document.querySelector('textarea[data-fabric="textarea"]');
    if (fabricTa instanceof HTMLElement) {
      rememberEditable(fabricTa);
      return fabricTa;
    }
  }
  return null;
}

/**
 * React controlled inputs ignore plain `el.value = …`; use the native setter so
 * `input` events propagate into React state (Cleo composer, etc.).
 *
 * @param {HTMLInputElement | HTMLTextAreaElement} el
 * @param {string} value
 */
function setNativeInputValue(el, value) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
  if (descriptor?.set) {
    descriptor.set.call(el, value);
  } else {
    el.value = value;
  }
}

/**
 * @param {HTMLInputElement | HTMLTextAreaElement} el
 * @param {string} nextValue
 * @param {number} caret
 */
function commitNativeInput(el, nextValue, caret) {
  setNativeInputValue(el, nextValue);
  try {
    el.focus({ preventScroll: true });
  } catch {
    el.focus();
  }
  el.setSelectionRange(caret, caret);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * @param {string} action — character, 'space', 'backspace', 'enter', 'tab'
 * @returns {boolean}
 */
export function insertAtFocusedField(action) {
  ensureFocusTracker();

  const el = resolveInsertTarget();
  if (el) {
    if (el.isContentEditable) {
      const ok = insertContentEditable(el, action);
      if (ok) return true;
    } else if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      insertIntoNativeField(el, action);
      return true;
    }
  }

  if (typeof fabricTextInsertHandler === 'function') {
    try {
      if (fabricTextInsertHandler(action)) return true;
    } catch {
      /* host bridge failed — fall through */
    }
  }

  return false;
}

/**
 * @param {HTMLInputElement | HTMLTextAreaElement} el
 * @param {string} action
 */
function insertIntoNativeField(el, action) {
  const value = el.value;
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? start;

  if (action === 'backspace') {
    if (start === end && start > 0) {
      commitNativeInput(el, value.slice(0, start - 1) + value.slice(end), start - 1);
    } else if (start !== end) {
      commitNativeInput(el, value.slice(0, start) + value.slice(end), start);
    } else {
      try {
        el.focus({ preventScroll: true });
      } catch {
        el.focus();
      }
    }
  } else if (action === 'space') {
    commitNativeInput(el, value.slice(0, start) + ' ' + value.slice(end), start + 1);
  } else if (action === 'enter') {
    if (el instanceof HTMLTextAreaElement) {
      commitNativeInput(el, value.slice(0, start) + '\n' + value.slice(end), start + 1);
    } else {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }
  } else if (action === 'tab') {
    commitNativeInput(el, value.slice(0, start) + '\t' + value.slice(end), start + 1);
  } else {
    commitNativeInput(el, value.slice(0, start) + action + value.slice(end), start + action.length);
  }
}

/**
 * @param {HTMLElement} el
 * @param {string} action
 */
function insertContentEditable(el, action) {
  try {
    el.focus({ preventScroll: true });
  } catch {
    el.focus();
  }
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  const range = selection.getRangeAt(0);

  if (action === 'backspace') {
    if (!range.collapsed) {
      range.deleteContents();
    } else {
      const test = range.cloneRange();
      test.setStart(range.startContainer, Math.max(0, range.startOffset - 1));
      test.deleteContents();
    }
  } else {
    const text = action === 'space' ? ' ' : action === 'enter' ? '\n' : action === 'tab' ? '\t' : action;
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  el.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

/** @returns {boolean} */
export function isEditableElement(el) {
  return resolveEditableElement(el) !== null;
}
