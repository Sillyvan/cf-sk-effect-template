<script lang="ts">
	import { toast } from 'svelte-sonner';
</script>

<main class="py-6">
	<div class="space-y-6">
		<!-- Cloudflare Workers Section -->
		<div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
			<h1 class="mb-4 text-lg font-medium text-gray-900">Cloudflare Workers</h1>
			<p class="mb-4 text-sm text-gray-600">
				Manage and configure your Cloudflare Workers deployment settings.
			</p>
			<button
				class="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700"
				onclick={() => toast.info('Worker management coming soon!')}
			>
				Manage Workers
			</button>
		</div>

		<!-- Cloudflare Pages Section -->
		<div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
			<h1 class="mb-4 text-lg font-medium text-gray-900">Cloudflare Pages</h1>
			<p class="mb-4 text-sm text-gray-600">
				Deploy and manage your SvelteKit application on Cloudflare Pages.
			</p>
			<div class="space-y-3">
				<div class="rounded-lg bg-gray-50 p-3">
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium text-gray-700">Deployment Status</span>
						<span class="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
							Active
						</span>
					</div>
				</div>
				<div class="rounded-lg bg-gray-50 p-3">
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium text-gray-700">Build Status</span>
						<span class="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
							Success
						</span>
					</div>
				</div>
			</div>
			<button
				class="mt-4 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700"
				onclick={() => toast.info('Pages management coming soon!')}
			>
				View Deployments
			</button>
		</div>

		<!-- Cloudflare R2 Section -->
		<div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
			<h1 class="mb-4 text-lg font-medium text-gray-900">Cloudflare R2 Storage</h1>
			<p class="mb-4 text-sm text-gray-600">
				Object storage compatible with Amazon S3 API.
			</p>
			<div class="grid grid-cols-2 gap-4">
				<div class="rounded-lg bg-gray-50 p-3 text-center">
					<div class="text-lg font-semibold text-gray-900">12.3 GB</div>
					<div class="text-xs text-gray-600">Storage Used</div>
				</div>
				<div class="rounded-lg bg-gray-50 p-3 text-center">
					<div class="text-lg font-semibold text-gray-900">1,247</div>
					<div class="text-xs text-gray-600">Objects</div>
				</div>
			</div>
			<button
				class="mt-4 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700"
				onclick={() => toast.info('R2 management coming soon!')}
			>
				Manage Buckets
			</button>
		</div>

		<!-- Cloudflare D1 Section -->
		<div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
			<h1 class="mb-4 text-lg font-medium text-gray-900">Cloudflare D1 Database</h1>
			<p class="mb-4 text-sm text-gray-600">
				Serverless SQL database built on SQLite.
			</p>
			<div class="space-y-3">
				<div class="rounded-lg bg-gray-50 p-3">
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium text-gray-700">Database Status</span>
						<span class="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
							Connected
						</span>
					</div>
				</div>
				<div class="rounded-lg bg-gray-50 p-3">
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium text-gray-700">Queries Today</span>
						<span class="text-sm font-semibold text-gray-900">2,847</span>
					</div>
				</div>
			</div>
			<button
				class="mt-4 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700"
				onclick={() => toast.info('D1 management coming soon!')}
			>
				Query Database
			</button>
		</div>
	</div>
</main>