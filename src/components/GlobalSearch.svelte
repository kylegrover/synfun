<script lang="ts">
  import { onMount } from 'svelte';
  import type { EntryCardData } from '../lib/entries';
  import { searchEntries, searchPages, type NavTarget } from '../lib/search';

  // Preloaded once in BaseLayout so search works from any page.
  export let entries: EntryCardData[] = [];
  export let pages: NavTarget[] = [];

  type ResultItem =
    | { kind: 'page'; page: NavTarget }
    | { kind: 'entry'; entry: EntryCardData };

  const LIMIT = 8;

  let open = false;
  let query = '';
  let items: ResultItem[] = [];
  let active = 0;
  let inputEl: HTMLInputElement | undefined;
  let debounce: ReturnType<typeof setTimeout>;

  function show() {
    if (open) {
      return;
    }
    open = true;
    queueMicrotask(() => inputEl?.focus());
  }

  function hide() {
    open = false;
    query = '';
    items = [];
    active = 0;
    clearTimeout(debounce);
  }

  // Debounce the scoring so fast typing doesn't re-rank on every keystroke.
  // Matching pages rank above content entries, since they're navigation intent.
  function onInput() {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      const pageHits: ResultItem[] = searchPages(pages, query).map((page) => ({ kind: 'page', page }));
      const entryHits: ResultItem[] = searchEntries(entries, query, LIMIT).map((entry) => ({ kind: 'entry', entry }));
      items = [...pageHits, ...entryHits];
      active = 0;
    }, 110);
  }

  function activate(item: ResultItem | undefined) {
    if (!item) {
      return;
    }
    if (item.kind === 'page') {
      if (item.page.external) {
        window.open(item.page.href, '_blank', 'noopener');
      } else {
        window.location.href = item.page.href;
      }
    } else {
      window.location.href = item.entry.href;
    }
  }

  function seeAll() {
    const trimmed = query.trim();
    if (trimmed) {
      window.location.href = `/browse?q=${encodeURIComponent(trimmed)}`;
    }
  }

  function onKeydown(event: KeyboardEvent) {
    if (!open) {
      if (event.key !== '?') {
        return;
      }
      // "?" (shift+/) opens search; "/" is left to the browser's quick-find.
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      event.preventDefault();
      show();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      hide();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      active = Math.min(active + 1, items.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      active = Math.max(active - 1, 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (items.length > 0) {
        activate(items[active]);
      } else {
        seeAll();
      }
    }
  }

  onMount(() => {
    window.addEventListener('keydown', onKeydown);
    window.addEventListener('open-search', show);
    return () => {
      window.removeEventListener('keydown', onKeydown);
      window.removeEventListener('open-search', show);
    };
  });
</script>

{#if open}
  <div class="search-overlay" role="presentation" on:click|self={hide}>
    <div class="search-dialog" role="dialog" aria-modal="true" aria-label="Search">
      <div class="search-dialog__bar">
        <span class="search-form__icon">⌕</span>
        <input
          bind:this={inputEl}
          bind:value={query}
          on:input={onInput}
          class="search-form__input"
          type="search"
          placeholder="search functions, snippets, write-ups, code…"
          autocomplete="off"
          spellcheck="false"
        />
        <span class="search-form__key">esc</span>
      </div>

      {#if query.trim()}
        {#if items.length > 0}
          <ul class="search-results">
            {#each items as item, index}
              <li>
                {#if item.kind === 'page'}
                  <a
                    href={item.page.href}
                    target={item.page.external ? '_blank' : undefined}
                    rel={item.page.external ? 'noreferrer' : undefined}
                    class={`search-result type-page ${index === active ? 'is-active' : ''}`}
                    on:mouseenter={() => (active = index)}
                  >
                    <span class="search-result__dot"></span>
                    <span class="search-result__title">{item.page.title}{item.page.external ? ' ↗' : ''}</span>
                    <span class="search-result__type">page</span>
                    <span class="search-result__summary">{item.page.hint}</span>
                  </a>
                {:else}
                  <a
                    href={item.entry.href}
                    class={`search-result type-${item.entry.type} ${index === active ? 'is-active' : ''}`}
                    on:mouseenter={() => (active = index)}
                  >
                    <span class="search-result__dot"></span>
                    <span class="search-result__title">{item.entry.title}</span>
                    <span class="search-result__type">{item.entry.type}</span>
                    <span class="search-result__summary">{item.entry.summary}</span>
                  </a>
                {/if}
              </li>
            {/each}
          </ul>
          <button class="search-dialog__all" type="button" on:click={seeAll}>
            See all results for “{query.trim()}” in browse →
          </button>
        {:else}
          <div class="search-dialog__hint">No matches for “{query.trim()}”.</div>
        {/if}
      {:else}
        <div class="search-dialog__hint">↑↓ to move · ↵ to open · esc to close</div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .search-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    justify-content: center;
    padding: 12vh 16px 16px;
    background: rgba(6, 6, 8, 0.66);
    backdrop-filter: blur(3px);
  }

  .search-dialog {
    width: 100%;
    max-width: 640px;
    height: fit-content;
    border: 1px solid var(--line-strong);
    border-radius: 14px;
    background: var(--surface);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
    overflow: hidden;
  }

  .search-dialog__bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 18px;
    border-bottom: 1px solid var(--line);
  }

  .search-results {
    margin: 0;
    padding: 6px;
    list-style: none;
    max-height: 52vh;
    overflow-y: auto;
  }

  .search-result {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 6px 10px;
    padding: 10px 12px;
    border-radius: 9px;
    color: var(--text);
    text-decoration: none;
  }

  .search-result.is-active {
    background: var(--surface2);
  }

  .search-result__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--muted);
  }

  .search-result.type-function .search-result__dot {
    background: var(--orange);
  }

  .search-result.type-snippet .search-result__dot {
    background: var(--teal);
  }

  .search-result.type-write-up .search-result__dot {
    background: var(--magenta);
  }

  .search-result.type-page .search-result__dot {
    background: var(--purple);
  }

  .search-result__title {
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 700;
  }

  .search-result__type {
    color: var(--faint);
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .search-result__summary {
    grid-column: 2 / 4;
    color: var(--muted);
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .search-dialog__all {
    width: 100%;
    padding: 12px 18px;
    border: 0;
    border-top: 1px solid var(--line);
    background: transparent;
    color: var(--orange);
    font-family: var(--font-mono);
    font-size: 13px;
    text-align: left;
    cursor: pointer;
  }

  .search-dialog__all:hover {
    background: var(--surface2);
  }

  .search-dialog__hint {
    padding: 16px 18px;
    color: var(--faint);
    font-family: var(--font-mono);
    font-size: 12px;
  }
</style>
