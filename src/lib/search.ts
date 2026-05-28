import type { EntryCardData } from './entries';

// A navigable destination (site page or external link) surfaced in search
// alongside content entries, so people can jump to e.g. Functions or Submit.
export interface NavTarget {
  title: string;
  href: string;
  hint: string;
  keywords: string[];
  external?: boolean;
}

export function searchPages(pages: NavTarget[], query: string): NavTarget[] {
  const terms = parseTerms(query);
  if (terms.length === 0) {
    return [];
  }

  return pages.filter((page) => {
    const haystack = `${page.title} ${page.hint} ${page.keywords.join(' ')}`.toLowerCase();
    return terms.some((term) => haystack.includes(term));
  });
}

// Shared search scoring used by both the /browse facet view and the global
// search overlay. Substring matching across weighted fields — exact and simple,
// no dependency. Body text (searchText) is weighted lowest so titles and tags win.
export function parseTerms(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

export function scoreEntry(entry: EntryCardData, terms: string[]): number {
  if (terms.length === 0) {
    return 0;
  }

  const title = entry.title.toLowerCase();
  const summary = entry.summary.toLowerCase();
  const excerpt = (entry.excerpt ?? '').toLowerCase();
  const submitter = entry.submittedBy.toLowerCase();
  const author = (entry.originalAuthor ?? '').toLowerCase();
  const tags = entry.tags.map((tag) => tag.toLowerCase());

  return terms.reduce((score, term) => {
    let next = score;

    if (title.includes(term)) {
      next += 8;
    }

    if (tags.some((tag) => tag.includes(term))) {
      next += 5;
    }

    if (summary.includes(term)) {
      next += 3;
    }

    if (excerpt.includes(term)) {
      next += 2;
    }

    if (submitter.includes(term) || author.includes(term)) {
      next += 1;
    }

    if (entry.searchText.includes(term)) {
      next += 1;
    }

    return next;
  }, 0);
}

// Rank entries by relevance, newest-first as a tiebreak. Returns only matches.
export function searchEntries(entries: EntryCardData[], query: string, limit?: number): EntryCardData[] {
  const terms = parseTerms(query);
  if (terms.length === 0) {
    return [];
  }

  const ranked = entries
    .map((entry) => ({ entry, score: scoreEntry(entry, terms) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) =>
      right.score !== left.score
        ? right.score - left.score
        : right.entry.date.getTime() - left.entry.date.getTime()
    )
    .map(({ entry }) => entry);

  return typeof limit === 'number' ? ranked.slice(0, limit) : ranked;
}
