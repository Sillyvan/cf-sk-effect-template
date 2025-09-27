<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { loadTest } from './load.remote';
	import type { LoadResult } from '$lib/types';

	let loadResult = $state<LoadResult | null>(null);

	async function load() {
		loadResult = await loadTest();
	}

	$effect(() => {
		if (loadResult?.status === 'failed') toast.error(loadResult.message);
	});
</script>

<main class="flex h-dvh w-dvw flex-col items-center justify-center gap-8 bg-slate-300 text-center">
	<div>
		<h1>Loading</h1>
	</div>
	<div>
		<h1>Query</h1>
		<button
			onclick={load}
			class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
		>
			Load
		</button>
		<p>Result:</p>
		<pre
			class="max-w-md overflow-auto rounded-lg bg-gray-800 p-4 text-left font-mono text-sm text-green-400"><code
				>{JSON.stringify(loadResult, null, 2)}</code
			></pre>
	</div>
</main>
