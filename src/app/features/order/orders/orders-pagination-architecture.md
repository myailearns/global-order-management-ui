# Orders Pagination Architecture

## Current strategy

The Orders grid uses server-driven querying with 50-row chunk caching in the page component.

1. Table always runs in server data mode.
2. The component requests order data in fixed chunks of 50 (`page = chunkIndex + 1`, `limit = 50`).
3. Grid pagination can still be 10, 20, or 50.
4. If the requested grid page is fully covered by already cached chunks, no new API call is made.
5. If the requested grid page crosses into an uncached chunk, only the missing chunk(s) are fetched.

Example with total 100 and page size 10:

1. First fetch loads rows 1-50 and total count 100.
2. Grid shows 10 pages.
3. Pages 1-5 are served from cache without API calls.
4. Moving to page 6 triggers fetch for rows 51-100.

## Query lifecycle

A query key is built from:

- search term
- sort field and direction
- advanced filters (`paymentStatus`, `rawStatus`, `deliveryDelayedFilter`, `source`, `rawCreatedAt` range)

When query key changes (search/filter/sort change):

1. cache is reset
2. page index is reset to 0 (page 1)
3. first required chunk is fetched

## Why this pattern

- reduces repeated calls while paging within a chunk
- keeps server as source of truth for search/filter/sort
- avoids loading full dataset in browser
- still provides smooth pagination UX at small page sizes

## Notes for maintainers

- Keep API sort key mapping in sync with backend allowed sort fields.
- Keep chunk size aligned with API max/default constraints.
- If table query fields change in shared UI, update the query-key builder here.
