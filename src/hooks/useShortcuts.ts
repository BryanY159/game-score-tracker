import { createContext, useContext, useEffect, useLayoutEffect, useRef } from 'react';

/**
 * FR-20 keyboard shortcuts: one shared layer. Screens, panels and sheets push a
 * layer of shortcuts while they're mounted; a key press goes to the top-most
 * live layer that handles it. A modal layer (a sheet or dialog) hides the
 * layers below it. Shortcuts don't fire while typing in a text field, except
 * Enter and Esc (AC-5).
 */
export interface Shortcut {
  /** Shown in the ? overlay, e.g. "⌘Z", "1–6", "+ then 2/4/6/8/0". */
  keys: string;
  label: string;
  match: (e: KeyLike) => boolean;
  run: (e: KeyLike) => void;
  /** Fire even while a text field has focus (only Enter and Esc should). */
  whileTyping?: boolean;
  /** Listed in the ? overlay (default true). Several keys can share one listed row. */
  listed?: boolean;
  /** Skip without taking the key (e.g. a button that's disabled right now). */
  enabled?: boolean;
}

export interface KeyLike {
  key: string;
  code: string;
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
}

export interface Layer {
  id: number;
  title: string;
  shortcuts: Shortcut[];
  modal?: boolean;
}

export function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  if (t.isContentEditable || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return true;
  if (t instanceof HTMLInputElement) return !['button', 'checkbox', 'radio', 'range', 'submit', 'reset'].includes(t.type);
  return false;
}

/**
 * A control the person reached with the keyboard (focus ring showing): Space
 * and Enter press it, as usual, instead of running a shortcut.
 */
export function isKeyboardFocusedControl(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  if (!t.matches('button, a[href], summary, [role="button"], [role="tab"], [role="switch"], [role="checkbox"], [role="radio"], input[type="checkbox"], input[type="radio"]')) return false;
  try {
    return t.matches(':focus-visible');
  } catch {
    return false;
  }
}

/** The live layers, top first: down to (and including) the first modal one. */
export function activeLayers(layers: Layer[]): Layer[] {
  const out: Layer[] = [];
  for (let i = layers.length - 1; i >= 0; i--) {
    out.push(layers[i]!);
    if (layers[i]!.modal) break;
  }
  return out;
}

export function resolve(layers: Layer[], e: KeyLike, typing: boolean): Shortcut | null {
  for (const layer of activeLayers(layers)) {
    for (const s of layer.shortcuts) {
      if (s.enabled === false) continue;
      if (typing && !s.whileTyping) continue;
      if (s.match(e)) return s;
    }
  }
  return null;
}

const plain = (e: KeyLike) => !e.metaKey && !e.ctrlKey && !e.altKey;
/** A plain letter or named key (any Shift state for letters). */
export const key = (k: string) => (e: KeyLike) => plain(e) && e.key.toLowerCase() === k.toLowerCase();
/** ⌘ (or Ctrl, for keyboards without ⌘) plus a key. */
export const cmd = (k: string) => (e: KeyLike) => (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === k;
/** A digit 0–9 without Shift, from the top row or the number pad. */
export function digitOf(e: KeyLike): number | null {
  if (!plain(e) || e.shiftKey) return null;
  const m = /^(?:Digit|Numpad)(\d)$/.exec(e.code);
  if (m) return Number(m[1]);
  return /^\d$/.test(e.key) ? Number(e.key) : null;
}
/** Shift plus a top-row digit (the physical key, since Shift+1 prints "!" on a US keyboard). */
export function shiftDigitOf(e: KeyLike): number | null {
  if (!e.shiftKey || !plain(e)) return null;
  const m = /^Digit(\d)$/.exec(e.code);
  return m ? Number(m[1]) : null;
}
export const isDigit = (e: KeyLike) => digitOf(e) !== null;
export const isPlus = (e: KeyLike) => plain(e) && (e.key === '+' || e.code === 'NumpadAdd');
export const isMinus = (e: KeyLike) => plain(e) && (e.key === '-' || e.key === '−' || e.code === 'NumpadSubtract');
/** Esc, or ⌘. (the iPad's Escape on keyboards without an Esc key). */
export const isEscape = (e: KeyLike) => e.key === 'Escape' || ((e.metaKey || e.ctrlKey) && e.key === '.');

export interface ShortcutRegistry {
  push: (title: string, shortcuts: Shortcut[], modal: boolean) => number;
  update: (id: number, title: string, shortcuts: Shortcut[]) => void;
  pop: (id: number) => void;
}
export const ShortcutContext = createContext<ShortcutRegistry | null>(null);

/**
 * Registers a layer while the component is mounted. Pass fresh handlers every
 * render; they replace the old ones without changing the layer's place. Modal
 * layers register in the layout phase, so a sheet's own content (registered in
 * the normal effect phase) lands above it, not hidden under it.
 */
export function useShortcuts(title: string, shortcuts: Shortcut[], { modal = false, enabled = true }: { modal?: boolean; enabled?: boolean } = {}) {
  const reg = useContext(ShortcutContext);
  const id = useRef<number | null>(null);
  const latest = useRef({ title, shortcuts });
  // Fresh handlers every commit (layout phase, before any key can arrive).
  useLayoutEffect(() => {
    latest.current = { title, shortcuts };
    if (reg && id.current !== null) reg.update(id.current, title, shortcuts);
  });
  const mount = () => {
    if (!reg || !enabled) return;
    id.current = reg.push(latest.current.title, latest.current.shortcuts, modal);
    return () => {
      if (id.current !== null) reg.pop(id.current);
      id.current = null;
    };
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => (modal ? mount() : undefined), [reg, modal, enabled]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => (modal ? undefined : mount()), [reg, modal, enabled]);
}
