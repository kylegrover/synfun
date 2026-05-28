import { getCollection, type CollectionEntry } from 'astro:content';
import { buildEditEntryUrl } from '../site';

export type Entry = CollectionEntry<'entries'>;
export type EntryType = Entry['data']['type'];
export type EntryLang = Entry['data']['lang'];

export interface EntryCardData {
  id: string;
  href: string;
  editHref: string;
  title: string;
  type: EntryType;
  typeRoute: string;
  lang: EntryLang;
  summary: string;
  excerpt?: string;
  tags: string[];
  submittedBy: string;
  originalAuthor?: string;
  source?: string;
  license: string;
  example?: string;
  date: Date;
  dateLabel: string;
  featured: boolean;
  cover?: string;
  readTime?: string;
  searchText: string;
}

const routeByType: Record<EntryType, string> = {
  function: '/functions',
  snippet: '/snippets',
  'write-up': '/write-ups'
};

export const typeAccentClass: Record<EntryType, string> = {
  function: 'type-function',
  snippet: 'type-snippet',
  'write-up': 'type-write-up'
};

export const typeAccentVar: Record<EntryType, string> = {
  function: 'var(--orange)',
  snippet: 'var(--teal)',
  'write-up': 'var(--magenta)'
};

export const langAccentClass: Record<EntryLang, string> = {
  glsl: 'lang-glsl',
  js: 'lang-js',
  json: 'lang-json',
  none: 'lang-none'
};

export function typeRoute(type: EntryType) {
  return routeByType[type];
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(date).toUpperCase();
}

// Normalize an MDX body into searchable text: collapse whitespace and
// lowercase. We deliberately keep markdown/code punctuation — the browse
// scorer matches substrings, so decoration like **bold** is already
// transparent, and stripping it would split identifiers like MAX_STEPS.
// Pagefind upgrade trigger: see README — switch when the /browse payload gets heavy.
export function toSearchText(body: string | undefined) {
  if (!body) {
    return '';
  }

  return body.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function estimateReadTime(body: string | undefined) {
  if (!body) {
    return undefined;
  }

  const words = body.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

export function toEntryCard(entry: Entry): EntryCardData {
  const readTime = entry.data.type === 'write-up' ? estimateReadTime(entry.body) : undefined;

  return {
    id: entry.id,
    href: `/e/${entry.id}`,
    editHref: buildEditEntryUrl(entry.id),
    title: entry.data.title,
    type: entry.data.type,
    typeRoute: typeRoute(entry.data.type),
    lang: entry.data.lang,
    summary: entry.data.summary,
    excerpt: entry.data.excerpt,
    tags: entry.data.tags,
    submittedBy: entry.data.submittedBy,
    originalAuthor: entry.data.originalAuthor,
    source: entry.data.source,
    license: entry.data.license,
    example: entry.data.example,
    date: entry.data.date,
    dateLabel: formatDate(entry.data.date),
    featured: entry.data.featured,
    cover: entry.data.cover,
    readTime,
    searchText: toSearchText(entry.body)
  };
}

export async function getAllEntries() {
  const entries = await getCollection('entries');
  return entries
    .sort((left, right) => right.data.date.getTime() - left.data.date.getTime())
    .map(toEntryCard);
}

export async function getEntriesByType(type: EntryType) {
  const entries = await getAllEntries();
  return entries.filter((entry) => entry.type === type);
}

export function getFeaturedEntries(entries: EntryCardData[]) {
  return entries.filter((entry) => entry.featured);
}

export function getRelatedEntries(entries: EntryCardData[], current: EntryCardData, limit = 3) {
  const currentTags = new Set(current.tags);

  return entries
    .filter((entry) => entry.id !== current.id)
    .map((entry) => ({
      entry,
      score: entry.tags.reduce((count, tag) => count + Number(currentTags.has(tag)), 0)
    }))
    .filter((match) => match.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.entry.date.getTime() - left.entry.date.getTime();
    })
    .slice(0, limit)
    .map((match) => match.entry);
}
