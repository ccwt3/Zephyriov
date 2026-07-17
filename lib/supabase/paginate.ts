// PostgREST caps every response at the project's `max-rows` limit (1000 by
// default), so a single unfiltered select silently truncates once a table
// grows past it. `fetchAllRows` pages through the whole result set with
// `.range()` so callers always get every row.
//
// `page` must build a FRESH query each call (a `.range()`d builder is consumed
// once it is awaited). Give the query a deterministic `.order()` on a unique
// column — otherwise paging can skip or repeat rows.

const PAGE_SIZE = 1000;

type Page<T> = PromiseLike<{
  data: T[] | null;
  error: { message: string } | null;
}>;

export async function fetchAllRows<T>(
  page: (from: number, to: number) => Page<T>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}
