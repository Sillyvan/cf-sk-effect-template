<script lang="ts">
	import { callWorker, callDurableObject } from './rpc.remote';

	let workerResult = $state<{ message: string } | null>(null);
	let doResult = $state<{ message: string } | null>(null);

	async function handleWorkerCall() {
		workerResult = await callWorker();
	}

	async function handleDOCall() {
		doResult = await callDurableObject();
	}
</script>

<main class="py-6">
	<div class="space-y-6">
		<!-- RPC Testing Panel -->
		<div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
			<h1 class="mb-4 text-lg font-medium text-gray-900">Cloudflare Workers RPC Testing</h1>
			<p class="mb-6 text-sm text-gray-600">
				Test Remote Procedure Calls (RPC) to Cloudflare Workers and Durable Objects using SvelteKit
				remote functions.
			</p>

			<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
				<!-- Worker RPC Section -->
				<div class="flex h-full">
					<div class="flex w-full flex-col rounded-lg border border-gray-200 p-4">
						<h3 class="text-md mb-2 font-medium text-gray-900">Worker RPC</h3>
						<p class="mb-4 text-sm text-gray-600">
							Call a method directly on the Cloudflare Worker.
						</p>
						<button
							class="w-full rounded-lg bg-orange-400 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-500"
							onclick={handleWorkerCall}
						>
							Call Worker RPC
						</button>

						{#if workerResult}
							<div class="mt-4 rounded-lg border border-green-200 bg-green-50 p-3">
								<div class="text-sm text-green-700">{workerResult.message}</div>
							</div>
						{/if}
					</div>
				</div>

				<!-- Durable Object RPC Section -->
				<div class="flex h-full">
					<div class="flex w-full flex-col rounded-lg border border-gray-200 p-4">
						<h3 class="text-md mb-2 font-medium text-gray-900">Durable Object RPC</h3>
						<p class="mb-4 flex-1 text-sm text-gray-600">
							Call a method on a Durable Object instance.
						</p>
						<button
							class="w-full rounded-lg bg-orange-400 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-500"
							onclick={handleDOCall}
						>
							Call Durable Object RPC
						</button>

						{#if doResult}
							<div class="mt-4 rounded-lg border border-green-200 bg-green-50 p-3">
								<div class="text-sm text-green-700">{doResult.message}</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
</main>
