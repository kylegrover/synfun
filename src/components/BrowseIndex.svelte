<script lang="ts">
  import { onMount } from 'svelte';
  import type { EntryCardData } from '../lib/entries';

  export let entries: EntryCardData[] = [];
  export let initialQuery = '';

  type EntryTypeFilter = 'all' | EntryCardData['type'];
  type EntryLangFilter = 'all' | Exclude<EntryCardData['lang'], 'none'>;
  type SortMode = 'recent' | 'top matches';

  let query = initialQuery;
  let activeType: EntryTypeFilter = 'all';
  let activeLang: EntryLangFilter = 'all';
  let activeTag = 'all';
  let sortMode: SortMode = initialQuery.trim() ? 'top matches' : 'recent';

  const typeFilters: EntryTypeFilter[] = ['all', 'function', 'snippet', 'write-up'];

  // The site is statically prerendered, so initialQuery is always empty at
  // build time — the real ?q= (e.g. from the homepage search form) is only
  // available client-side. Pick it up on mount.
  onMount(() => {
    const urlQuery = new URLSearchParams(window.location.search).get('q');
    if (urlQuery && !query) {
      query = urlQuery;
      sortMode = 'top matches';
    }
  });

  function scoreEntry(entry: EntryCardData, terms: string[]) {
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

  function typeClass(type: EntryCardData['type']) {
    return type === 'function'
      ? 'facet-chip--function'
      : type === 'snippet'
        ? 'facet-chip--snippet'
        : 'facet-chip--write-up';
  }

  function labelForType(type: EntryTypeFilter) {
    return type === 'all' ? 'All' : type === 'write-up' ? 'write-ups' : `${type}s`;
  }

  $: queryTerms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  $: languageFilters = Array.from(new Set(entries.map((entry) => entry.lang).filter((lang) => lang !== 'none')));
  $: tagFilters = Array.from(new Set(entries.flatMap((entry) => entry.tags)))
    .sort((left, right) => left.localeCompare(right))
    .slice(0, 8);

  $: filteredEntries = entries
    .map((entry) => ({ entry, score: scoreEntry(entry, queryTerms) }))
    .filter(({ entry, score }) => {
      const matchesQuery = queryTerms.length === 0 || score > 0;
      const matchesType = activeType === 'all' || entry.type === activeType;
      const matchesLang = activeLang === 'all' || entry.lang === activeLang;
      const matchesTag = activeTag === 'all' || entry.tags.includes(activeTag);

      return matchesQuery && matchesType && matchesLang && matchesTag;
    })
    .sort((left, right) => {
      const activeSort = queryTerms.length === 0 ? 'recent' : sortMode;

      if (activeSort === 'top matches' && right.score !== left.score) {
        return right.score - left.score;
      }

      return right.entry.date.getTime() - left.entry.date.getTime();
    })
    .map(({ entry }) => entry);

  $: resultSummary = queryTerms.length > 0
    ? `${filteredEntries.length} results for "${query.trim()}" · ${sortMode === 'top matches' ? 'ranked by relevance' : 'newest first'}`
    : `${filteredEntries.length} entries · newest first`;

  $: if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);

    if (query.trim()) {
      url.searchParams.set('q', query.trim());
    } else {
      url.searchParams.delete('q');
    }

    window.history.replaceState({}, '', url);
  }
</script>

<div class="search-form">
  <span class="search-form__icon">⌕</span>
  <input
    class="search-form__input"
    bind:value={query}
    type="search"
    name="q"
    placeholder="search functions, tags, authors — try palette or beat"
  />
  <span class="search-form__key">esc</span>
</div>

<div class="facet-bar">
  {#each typeFilters as type}
    <button
      class={`facet-chip ${type !== 'all' ? typeClass(type) : ''} ${activeType === type ? 'is-active' : ''}`}
      type="button"
      on:click={() => {
        activeType = type;
      }}
    >
      {labelForType(type)}
    </button>
  {/each}

  <span class="facet-divider"></span>

  {#each languageFilters as lang}
    <button
      class={`facet-chip ${activeLang === lang ? 'is-active' : ''}`}
      type="button"
      on:click={() => {
        activeLang = activeLang === lang ? 'all' : lang;
      }}
    >
      {lang}
    </button>
  {/each}

  {#if tagFilters.length > 0}
    <span class="facet-divider"></span>

    {#each tagFilters as tag}
      <button
        class={`facet-chip ${activeTag === tag ? 'is-active' : ''}`}
        type="button"
        on:click={() => {
          activeTag = activeTag === tag ? 'all' : tag;
        }}
      >
        #{tag}
      </button>
    {/each}
  {/if}

  <label class="sort-label">
    sort:
    <select class="facet-select" bind:value={sortMode}>
      <option value="top matches">top matches</option>
      <option value="recent">recent</option>
    </select>
  </label>
</div>

<div class="count-line">{resultSummary}</div>

{#if filteredEntries.length > 0}
  <div class="row-list">
    {#each filteredEntries as entry}
      <a class={`entry-row ${entry.type === 'write-up' ? 'entry-row--expanded' : ''}`} href={entry.href}>
        <div class="entry-row__content">
          <div class="entry-row__header">
            <span class="entry-row__title">{entry.title}</span>

            <span class={`type-tag ${entry.type === 'function' ? 'type-function' : entry.type === 'snippet' ? 'type-snippet' : 'type-write-up'}`}>
              <span class="type-dot"></span>
              <span class="type-label">{entry.type.toUpperCase()}</span>
              {#if entry.lang !== 'none' && entry.type !== 'write-up'}
                <span class={`lang-pill ${entry.lang === 'glsl' ? 'lang-glsl' : entry.lang === 'js' ? 'lang-js' : 'lang-json'}`}>{entry.lang.toUpperCase()}</span>
              {/if}
            </span>
          </div>

          <p class="entry-row__summary">{entry.type === 'write-up' ? entry.excerpt ?? entry.summary : entry.summary}</p>

          {#if entry.tags.length > 0}
            <div class="entry-row__tags">
              {#each entry.tags.slice(0, 3) as tag}
                <span class="hash-tag">#{tag}</span>
              {/each}
            </div>
          {/if}
        </div>

        <div class="entry-row__side">
          <span class="entry-row__author">@{entry.submittedBy}</span>
          <span class="entry-row__date">{entry.dateLabel}{entry.readTime ? ` · ${entry.readTime}` : ''}</span>
        </div>

        <span class="entry-row__arrow">→</span>
      </a>
    {/each}
  </div>
{:else}
  <div class="empty-state">No entries match the current search and facets yet.</div>
{/if}