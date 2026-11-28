import type { Element, ElementContent, Root, Text } from 'hast';
import type { WebSource } from '../../widgets/ConversationWidget/conversation.models';

// A marker may come with its brackets escaped, \[6\] (markdown for a literal "[6]")
const MARKER = /\\?\[(\d{1,3})\\?\](?!\()/g;
const MARKER_TEXT = /^\[(\d{1,3})\]$/;

/** More chips than this in one run show as this many less one, then "+N". */
export const MAX_CHIPS_IN_RUN = 4;

/**
 * Where a citation's link points: its source's page, or, for a source with no
 * page (cited from the model's own knowledge), a fragment naming it.
 */
export const citationHref = (source: WebSource): string =>
  source.url || `#cite-${source.index}`;

/**
 * Turn bare [n] citation markers into markdown links to their web source, so
 * the markdown renderer makes them clickable. Only indices that exist in
 * webSources are linked — the model can occasionally emit a stray marker, and
 * an unknown index is left as plain text rather than a dead link. Markers
 * already followed by "(" are part of an existing markdown link and skipped.
 */
export function linkifyCitations(
  text: string,
  webSources?: WebSource[] | null
): string {
  if (!text || !webSources || webSources.length === 0) return text;
  const byIndex = new Map(webSources.map(s => [s.index, citationHref(s)]));
  return text.replace(MARKER, (marker, n) => {
    const url = byIndex.get(Number(n));
    return url ? `[[${n}]](${url})` : marker;
  });
}

/** How many times each source index is cited in the text. */
export function countCitations(text: string): Map<number, number> {
  const counts = new Map<number, number>();
  text.replace(MARKER, (marker, n) => {
    const index = Number(n);
    counts.set(index, (counts.get(index) ?? 0) + 1);
    return marker;
  });
  return counts;
}

/** The source number a rendered link stands for when it is a citation marker. */
export function citationIndexOf(node: ElementContent): number | null {
  if (node.type !== 'element' || node.tagName !== 'a') return null;
  if (node.children.length !== 1) return null;
  const child = node.children[0];
  if (child.type !== 'text') return null;
  const match = MARKER_TEXT.exec(child.value);
  return match ? Number(match[1]) : null;
}

const isBlank = (node: ElementContent) =>
  node.type === 'text' && node.value.trim() === '';

const SKIP = new Set(['pre', 'code']);

/** Elements a word is never split out of: code stays whole, a link stays one link. */
const KEEP_WHOLE = new Set(['pre', 'code', 'a', 'img', 'br']);

/**
 * The last word at the end of a node, apart from what comes before it. A word
 * inside formatting (bold, italic) keeps that formatting: the element splits
 * into one copy holding the text before the word and one holding the word.
 */
function splitLastWord(
  node: ElementContent
): { rest: ElementContent | null; word: ElementContent } | null {
  if (node.type === 'text') {
    const trimmed = node.value.replace(/\s+$/, '');
    const word = /\S+$/.exec(trimmed);
    if (!word) return null;
    const rest = trimmed.slice(0, word.index);
    return {
      rest: rest ? { type: 'text', value: rest } : null,
      word: { type: 'text', value: word[0] },
    };
  }
  if (node.type !== 'element' || KEEP_WHOLE.has(node.tagName)) return null;
  const last = node.children[node.children.length - 1];
  if (!last) return null;
  const split = splitLastWord(last);
  if (!split) return null;
  const before = node.children.slice(0, -1);
  if (split.rest) before.push(split.rest);
  return {
    rest: before.length ? { ...node, children: before } : null,
    word: { ...node, children: [split.word] },
  };
}

export interface CitationRunOptions {
  /** Class of the span that keeps a run of chips on the line of the word before it. */
  runClassName?: string;
}

/**
 * Rehype plugin for citation links (from linkifyCitations): a run of adjacent
 * citations, with the last word before it, goes into one unbreakable span so
 * chips never start a line on their own; the space before the run goes (the
 * chips keep their own gap). A run longer than MAX_CHIPS_IN_RUN keeps its
 * first citations and folds the rest into one link marked
 * data-citation-more="19 20 21", whose text is their markers.
 */
export function rehypeCitationRuns(options: CitationRunOptions = {}) {
  const runClass = options.runClassName ? [options.runClassName] : [];

  const visit = (parent: Root | Element) => {
    if (parent.type === 'element' && SKIP.has(parent.tagName)) return;
    const children = parent.children as ElementContent[];
    const out: ElementContent[] = [];
    let i = 0;
    while (i < children.length) {
      const node = children[i];
      if (citationIndexOf(node) === null) {
        if (node.type === 'element') visit(node);
        out.push(node);
        i += 1;
        continue;
      }

      const run: Element[] = [];
      let j = i;
      while (j < children.length) {
        if (citationIndexOf(children[j]) !== null) {
          run.push(children[j] as Element);
          j += 1;
        } else if (
          isBlank(children[j]) &&
          j + 1 < children.length &&
          citationIndexOf(children[j + 1]) !== null
        ) {
          j += 1;
        } else {
          break;
        }
      }

      let shown: Element[] = run;
      if (run.length > MAX_CHIPS_IN_RUN) {
        const keep = MAX_CHIPS_IN_RUN - 1;
        const folded = run.slice(keep);
        const more: Element = {
          type: 'element',
          tagName: 'a',
          properties: {
            href: folded[0].properties?.href,
            dataCitationMore: folded
              .map(link => citationIndexOf(link))
              .join(' '),
          },
          children: [
            {
              type: 'text',
              value: folded
                .map(link => (link.children[0] as Text).value)
                .join(''),
            },
          ],
        };
        shown = [...run.slice(0, keep), more];
      }

      const lead: ElementContent[] = [];
      if (out.length && isBlank(out[out.length - 1])) out.pop();
      const previous = out[out.length - 1];
      const split = previous ? splitLastWord(previous) : null;
      if (split) {
        out.pop();
        if (split.rest) out.push(split.rest);
        lead.push(split.word);
      }

      out.push({
        type: 'element',
        tagName: 'span',
        properties: runClass.length ? { className: runClass } : {},
        children: [...lead, ...shown],
      });
      i = j;
    }
    parent.children = out as typeof parent.children;
  };

  return (tree: Root) => {
    visit(tree);
  };
}
