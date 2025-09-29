<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { queryTest } from './query.remote';
	import { loadItems } from './load.remote';
	import { commandTest } from './command.remote';
	import { formTest, formValueTest } from './form.remote';
	import type { Item } from '$lib/types';

	// State management for pagination
	let items = $state<Item[]>([]);
	let currentOffset = $state(0);
	let hasMore = $state(true);
	let isLoading = $state(false);
	let loadError = $state<string | null>(null);

	await itemLoader();

	async function itemLoader() {
		if (isLoading || !hasMore) return;

		isLoading = true;
		loadError = null;

		const result = await loadItems(currentOffset);

		items = [...items, ...result.items];
		currentOffset += result.items.length;
		hasMore = result.hasMore;

		isLoading = false;
	}

	let queryResult = $state<ReturnType<typeof queryTest> | null>(null);

	async function load() {
		const query = queryTest();
		queryResult = query;

		const result = await query;
		if (result.status === 'failed') {
			toast.error(result.message);
		}
	}
</script>

<main class="py-6">
	<div class="space-y-6">
		<!-- Load Section -->
		<div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
			<h1 class="mb-4 text-lg font-medium text-gray-900">Load</h1>

			{#if isLoading && items.length === 0}
				<div class="mb-4 flex items-center justify-center rounded-lg border bg-gray-50 p-8">
					<div class="flex items-center space-x-2">
						<div
							class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900"
						></div>
						<span class="text-sm text-gray-600">Loading items...</span>
					</div>
				</div>
			{:else}
				<div class="mb-4 space-y-3">
					{#each items as item (item.id)}
						<div class="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
							{item.name}
							{#if item.description}
								<span class="text-gray-500"> - {item.description}</span>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			{#if loadError}
				<div class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
					{loadError}
				</div>
			{/if}

			{#if hasMore}
				<button
					onclick={itemLoader}
					disabled={isLoading}
					class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
				>
					{#if isLoading}
						<span class="flex items-center space-x-2">
							<div
								class="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"
							></div>
							<span>Loading...</span>
						</span>
					{:else}
						Load more
					{/if}
				</button>
			{/if}
		</div>

		<!-- Query Section -->
		<div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
			<h1 class="mb-4 text-lg font-medium text-gray-900">Query</h1>
			<button
				onclick={load}
				class="mb-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
				disabled={queryResult?.loading}
			>
				Load
			</button>
			<p class="mb-3 text-sm font-medium text-gray-700">Result:</p>
			{#if queryResult?.loading}
				<div class="flex items-center justify-center rounded-lg border bg-gray-50 p-8">
					<div class="flex items-center space-x-2">
						<div
							class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900"
						></div>
						<span class="text-sm text-gray-600">Loading...</span>
					</div>
				</div>
			{:else if queryResult?.error}
				<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
					Error: {queryResult.error}
				</div>
			{:else if queryResult?.current}
				<pre class="overflow-auto rounded-lg border bg-gray-900 p-4 text-xs text-green-400"><code
						>{JSON.stringify(queryResult.current, null, 2)}</code
					></pre>
			{:else}
				<div class="rounded-lg border bg-gray-50 p-4 text-center text-sm text-gray-500">
					Click "Load" to fetch data
				</div>
			{/if}
		</div>

		<!-- Command Section -->
		<div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
			<h1 class="mb-4 text-lg font-medium text-gray-900">Command</h1>
			<button
				class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
				onclick={() => commandTest()}
			>
				Execute Command
			</button>
		</div>

		<!-- Form Section -->
		<div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
			<h1 class="mb-4 text-lg font-medium text-gray-900">Form</h1>
			<p class="mb-3 text-sm font-medium text-gray-700">Result:</p>
			<pre class="mb-6 overflow-auto rounded-lg border bg-gray-900 p-4 text-xs text-green-400"><code
					>{JSON.stringify(await formValueTest(), null, 2)}</code
				></pre>

			<form {...formTest} class="space-y-4">
				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700"> Title </label>
					<input
						name="name"
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
						placeholder="Enter title..."
					/>
				</div>

				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700"> Age </label>
					<input
						type="number"
						name="age"
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
						placeholder="Enter age..."
					/>
				</div>

				<button
					class="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
				>
					Publish
				</button>
			</form>
		</div>
	</div>
</main>
