import { Effect } from 'effect';
import { query } from '$app/server';
import type { Item } from '$lib/types';
import * as v from 'valibot';

const TOTAL_ITEMS = 6;
const ITEMS_PER_PAGE = 2;

const mockItems: Item[] = Array.from({ length: TOTAL_ITEMS }, (_, i) => ({
	id: i + 1,
	name: `Item ${i + 1}`,
	description: `Description for item ${i + 1}`
}));

export const loadItems = query(v.number(), async (offset) => {
	const startIndex = offset;
	const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, TOTAL_ITEMS);
	const items = mockItems.slice(startIndex, endIndex);

	const effect = Effect.succeed({
		items,
		hasMore: endIndex < TOTAL_ITEMS,
		total: TOTAL_ITEMS,
		offset: startIndex
	});

	return await Effect.runPromise(effect);
});
