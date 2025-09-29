<script lang="ts">
	import { Toaster } from 'svelte-sonner';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	import '../app.css';

	let { children } = $props();
</script>

<div class="min-h-dvh bg-gray-50">
	<!-- Tab Navigation -->
	<div class="bg-gray-100 pt-6">
		<div class="mx-auto max-w-3xl px-6">
			<nav class="flex space-x-1">
				<a
					href={resolve('/')}
					class="relative rounded-t-lg px-4 py-3 text-sm font-medium transition-colors
						{page.url.pathname === '/'
						? 'border-b-2 border-white bg-white text-gray-900'
						: 'bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-900'}"
				>
					Remote Functions
				</a>
				<a
					href={resolve('/cloudflare')}
					class="relative rounded-t-lg px-4 py-3 text-sm font-medium transition-colors
						{page.url.pathname === '/cloudflare'
						? 'border-b-2 border-white bg-white text-gray-900'
						: 'bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-900'}"
				>
					Cloudflare
				</a>
			</nav>
		</div>
	</div>

	<!-- Page Content -->
	<div class="bg-white">
		<div class="mx-auto max-w-3xl px-6">
			{@render children?.()}
		</div>
	</div>
</div>

<Toaster />
