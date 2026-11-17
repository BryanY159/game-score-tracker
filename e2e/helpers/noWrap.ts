import { expect, type Page } from '@playwright/test';

/**
 * Automated NFR-6 / NFR-3 checks, run on every screen in every project:
 *  1. short labels ([data-nowrap], buttons, links, tab labels) sit on one line,
 *  2. no [data-nowrap] text overflows its box unless it is deliberately truncated,
 *  3. no horizontal page scroll,
 *  4. every tap target is at least 44×44 (unless marked data-tap-exempt).
 * Returns nothing; fails the test with a list of offending elements.
 */
export async function expectLayoutClean(page: Page) {
  const problems = await page.evaluate(() => {
    const out: string[] = [];
    const describe = (el: Element) => {
      const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
      const label = el.getAttribute('aria-label');
      return `<${el.tagName.toLowerCase()}> "${text || label || ''}"`;
    };
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
    };
    /** Most lines any single text run inside `el` occupies. Stacked runs (name over subtitle) are fine. */
    const lineCount = (el: Element) => {
      let max = 0;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      while ((n = walker.nextNode())) {
        if (!n.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        const tops = new Set<number>();
        for (const rect of Array.from(range.getClientRects())) {
          if (rect.width > 0) tops.add(Math.round(rect.top / 4));
        }
        max = Math.max(max, tops.size);
      }
      return max;
    };

    const labels = document.querySelectorAll('[data-nowrap], button, a, [role="button"], nav span');
    for (const el of Array.from(labels)) {
      if (!visible(el)) continue;
      if (lineCount(el) > 1) out.push(`wrapped: ${describe(el)}`);
    }

    for (const el of Array.from(document.querySelectorAll<HTMLElement>('[data-nowrap]'))) {
      if (!visible(el)) continue;
      const truncated = getComputedStyle(el).textOverflow === 'ellipsis';
      if (!truncated && el.scrollWidth > el.clientWidth + 1) out.push(`overflow: ${describe(el)}`);
      const r = el.getBoundingClientRect();
      if (r.right > window.innerWidth + 0.5 || r.left < -0.5) out.push(`off-screen: ${describe(el)}`);
    }

    if (document.documentElement.scrollWidth > window.innerWidth) {
      out.push(`horizontal scroll: page is ${document.documentElement.scrollWidth}px wide`);
    }

    const targets = document.querySelectorAll('button, a[href], input, select, textarea, [role="button"]');
    for (const el of Array.from(targets)) {
      if (!visible(el) || el.closest('[data-tap-exempt]')) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 43.5 || r.height < 43.5) {
        out.push(`tap target ${Math.round(r.width)}×${Math.round(r.height)}: ${describe(el)}`);
      }
    }
    return out;
  });
  expect(problems, problems.join('\n')).toEqual([]);
}
