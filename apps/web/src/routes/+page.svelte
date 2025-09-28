<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { queryTest } from './query.remote';
	import { loadItems } from './load.remote';
	import type { QueryResult } from '$lib/types';
	import { commandTest } from './command.remote';
	import { formTest, formValueTest } from './form.remote';

	let currentOffset = $state(0);
	let items = $derived(await loadItems(0));

	async function loadMore() {
		currentOffset += 2;
		const newItems = await loadItems(currentOffset);

		items = { ...newItems, items: [...items.items, ...newItems.items] };
	}

	let queryResult = $state<QueryResult | null>(null);

	async function load() {
		queryResult = await queryTest();
	}

	$effect(() => {
		if (queryResult?.status === 'failed') toast.error(queryResult.message);
	});
</script>

<main class="min-h-dvh bg-slate-100 p-8">
	<div class="mx-auto max-w-4xl space-y-8">
		<!-- Load Section -->
		<div class="rounded-lg bg-white p-6 shadow">
			<h1 class="mb-4 text-xl font-semibold">Load</h1>
			<div class="mb-4 space-y-2">
				{#each items.items as item (item)}
					<div class="rounded bg-slate-50 p-2">{item.name}</div>
				{/each}
			</div>
			{#if items.hasMore}
				<button
					onclick={loadMore}
					class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
				>
					Load more
				</button>
			{/if}
		</div>

		<!-- Query Section -->
		<div class="rounded-lg bg-white p-6 shadow">
			<h1 class="mb-4 text-xl font-semibold">Query</h1>
			<button
				onclick={load}
				class="mb-4 rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
			>
				Load
			</button>
			<p class="mb-2 font-medium">Result:</p>
			<pre class="overflow-auto rounded-lg bg-gray-800 p-4 text-sm text-green-400"><code
					>{JSON.stringify(queryResult, null, 2)}</code
				></pre>
		</div>
		<div class="rounded-lg bg-white p-6 shadow">
			<h1 class="mb-4 text-xl font-semibold">Command</h1>
			<button
				class="mb-4 rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
				onclick={() => commandTest()}
			>
				Command
			</button>
		</div>
		<div class="rounded-lg bg-white p-6 shadow">
			<h1 class="mb-4 text-xl font-semibold">Form</h1>
			<p class="mb-2 font-medium">Result:</p>
			<pre class="overflow-auto rounded-lg bg-gray-800 p-4 text-sm text-green-400"><code
					>{JSON.stringify(await formValueTest(), null, 2)}</code
				></pre>

			<form {...formTest}>
				<label>
					<h2>Title</h2>
					<input name="name" />
				</label>

				<label>
					<h2>Write your post</h2>
					<input type="number" name="age" />
				</label>

				<button>Publish!</button>
			</form>
		</div>
	</div>
</main>
