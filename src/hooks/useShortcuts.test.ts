import { describe, expect, it } from 'vitest';
import { activeLayers, cmd, digitOf, isEscape, key, resolve, shiftDigitOf, type KeyLike, type Layer, type Shortcut } from './useShortcuts';

const ev = (k: string, code = '', mods: Partial<KeyLike> = {}): KeyLike => ({ key: k, code, shiftKey: false, metaKey: false, ctrlKey: false, altKey: false, ...mods });
const sc = (label: string, match: Shortcut['match'], extra: Partial<Shortcut> = {}): Shortcut => ({ keys: label, label, match, run: () => {}, ...extra });

describe('FR-20 shortcut layer', () => {
  const screen: Layer = { id: 1, title: 'Game', shortcuts: [sc('undo', cmd('z')), sc('bust', key('b')), sc('enter', key('Enter'), { whileTyping: true })] };
  const sheet: Layer = { id: 2, title: 'Sheet', modal: true, shortcuts: [sc('close', isEscape, { whileTyping: true })] };
  const inSheet: Layer = { id: 3, title: 'Add ticket', shortcuts: [sc('completed', key('c'))] };

  it('finds the shortcut on the top-most live layer', () => {
    expect(resolve([screen], ev('b'), false)?.label).toBe('bust');
    expect(resolve([screen], ev('z', 'KeyZ', { metaKey: true }), false)?.label).toBe('undo');
    expect(resolve([screen], ev('z', 'KeyZ', { ctrlKey: true }), false)?.label).toBe('undo');
    expect(resolve([screen], ev('z'), false)).toBeNull();
  });

  it('a modal layer hides the layers under it, but not the ones above it', () => {
    expect(activeLayers([screen, sheet, inSheet]).map((l) => l.id)).toEqual([3, 2]);
    expect(resolve([screen, sheet, inSheet], ev('b'), false)).toBeNull();
    expect(resolve([screen, sheet, inSheet], ev('c'), false)?.label).toBe('completed');
    expect(resolve([screen, sheet], ev('Escape'), false)?.label).toBe('close');
  });

  it("doesn't fire while typing, except Enter and Esc (AC-5)", () => {
    expect(resolve([screen], ev('b'), true)).toBeNull();
    expect(resolve([screen], ev('z', 'KeyZ', { metaKey: true }), true)).toBeNull();
    expect(resolve([screen], ev('Enter'), true)?.label).toBe('enter');
    expect(resolve([screen, sheet], ev('Escape'), true)?.label).toBe('close');
  });

  it('skips disabled shortcuts', () => {
    expect(resolve([{ ...screen, shortcuts: [sc('bust', key('b'), { enabled: false })] }], ev('b'), false)).toBeNull();
  });

  it('reads digits from the key or the physical key, Shift digits by the physical key, and ⌘. as Esc', () => {
    expect(digitOf(ev('7', 'Digit7'))).toBe(7);
    expect(digitOf(ev('0', 'Numpad0'))).toBe(0);
    expect(digitOf(ev('!', 'Digit1', { shiftKey: true }))).toBeNull();
    expect(shiftDigitOf(ev('!', 'Digit1', { shiftKey: true }))).toBe(1);
    expect(shiftDigitOf(ev('@', 'Digit2', { shiftKey: true }))).toBe(2);
    expect(shiftDigitOf(ev('2', 'Digit2'))).toBeNull();
    expect(isEscape(ev('.', 'Period', { metaKey: true }))).toBe(true);
    expect(isEscape(ev('.', 'Period'))).toBe(false);
  });
});
