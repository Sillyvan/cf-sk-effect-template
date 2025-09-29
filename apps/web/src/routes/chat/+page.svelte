<script lang="ts">
	import { Effect } from 'effect';
	import { ChatEffects } from '$lib/chat/chat-effects.js';
	import type { Message } from '$lib/chat/chat-types.js';
	import { dev } from '$app/environment';

	// Chat state using Svelte 5 runes
	let messages = $state<Message[]>([]);
	let username = $state('');
	let messageInput = $state('');
	let isConnected = $state(false);
	let isJoined = $state(false);
	let connection = $state<any>(null);
	let connectionError = $state('');
	let sendError = $state('');

	// Form states
	let isConnecting = $state(false);
	let isJoining = $state(false);
	let isSending = $state(false);

	// WebSocket URL - derived from environment
	let wsUrl = $derived.by(() => {
		if (typeof window === 'undefined') return '';

		// In production, this should be the worker's URL
		// For development, you'll need to run the worker separately and update this URL
		// Example: 'wss://cf-sk-effect-template-worker.your-subdomain.workers.dev/websocket'

		// For local development, assuming worker runs on port 8787 (wrangler dev default)

		if (dev) {
			// Local development - connect to worker dev server
			return 'ws://localhost:8787/websocket';
		} else {
			// Production - update this to your worker's URL
			return 'wss://cf-sk-effect-template-worker.your-subdomain.workers.dev/websocket';
		}
	});

	// Cleanup effect
	$effect(() => {
		return () => {
			if (connection) {
				Effect.runSync(ChatEffects.disconnect(connection));
			}
		};
	});

	async function connectToChat() {
		if (!wsUrl) return;

		isConnecting = true;
		connectionError = '';

		try {
			const result = await Effect.runPromise(
				ChatEffects.connect(wsUrl).pipe(
					Effect.catchTags({
						ConnectionError: (error) =>
							Effect.succeed({
								success: false as const,
								error: error.reason
							})
					}),
					Effect.map((conn) => ({
						success: true as const,
						connection: conn
					}))
				)
			);

			if (result.success) {
				connection = result.connection;
				isConnected = true;
				// Message stream will start automatically via $effect
			} else {
				connectionError = result.error;
			}
		} catch (error) {
			connectionError = `Failed to connect: ${error}`;
		} finally {
			isConnecting = false;
		}
	}

	// Effect to manage message stream when connection is established
	$effect(() => {
		if (!connection) return;

		// Set up direct WebSocket event listeners to debug
		const handleMessage = (event: MessageEvent) => {
			try {
				const message: Message = JSON.parse(event.data);
				messages = [...messages, message];
			} catch (error) {
				// Handle raw text messages for debugging
				const debugMessage: Message = {
					id: 'debug-' + Date.now(),
					content: `Raw message: ${event.data}`,
					timestamp: Date.now(),
					type: 'server'
				};
				messages = [...messages, debugMessage];
			}
		};

		const handleError = (event: Event) => {
			connectionError = 'WebSocket error occurred';
			isConnected = false;
		};

		const handleClose = (event: CloseEvent) => {
			isConnected = false;
			connection = null;
		};

		// Add event listeners
		connection.socket.addEventListener('message', handleMessage);
		connection.socket.addEventListener('error', handleError);
		connection.socket.addEventListener('close', handleClose);

		// Return cleanup function
		return () => {
			connection.socket.removeEventListener('message', handleMessage);
			connection.socket.removeEventListener('error', handleError);
			connection.socket.removeEventListener('close', handleClose);
		};
	});

	async function joinChat() {
		if (!connection || !username.trim()) return;

		isJoining = true;
		connectionError = '';

		try {
			const result = await Effect.runPromise(
				ChatEffects.joinChat(connection, username.trim()).pipe(
					Effect.catchTags({
						ValidationError: (error) =>
							Effect.succeed({
								success: false as const,
								error: `Validation failed: ${error.reason}`
							}),
						MessageError: (error) =>
							Effect.succeed({
								success: false as const,
								error: `Message error: ${error.reason}`
							})
					}),
					Effect.map(() => ({
						success: true as const
					}))
				)
			);

			if (result.success) {
				isJoined = true;
			} else {
				connectionError = result.error;
			}
		} catch (error) {
			connectionError = `Failed to join: ${error}`;
		} finally {
			isJoining = false;
		}
	}

	async function sendMessage() {
		if (!connection || !messageInput.trim()) return;

		isSending = true;
		sendError = '';

		try {
			const result = await Effect.runPromise(
				ChatEffects.sendChatMessage(connection, messageInput.trim()).pipe(
					Effect.catchTags({
						ValidationError: (error) =>
							Effect.succeed({
								success: false as const,
								error: `Validation failed: ${error.reason}`
							}),
						MessageError: (error) =>
							Effect.succeed({
								success: false as const,
								error: `Message error: ${error.reason}`
							})
					}),
					Effect.map(() => ({
						success: true as const
					}))
				)
			);

			if (result.success) {
				messageInput = '';
			} else {
				sendError = result.error;
			}
		} catch (error) {
			sendError = `Failed to send message: ${error}`;
		} finally {
			isSending = false;
		}
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			if (isJoined) {
				sendMessage();
			} else if (isConnected) {
				joinChat();
			} else {
				connectToChat();
			}
		}
	}

	function formatTime(timestamp: number): string {
		return new Date(timestamp).toLocaleTimeString();
	}

	function getMessageClass(message: Message): string {
		switch (message.type) {
			case 'server':
				return 'text-blue-600 italic';
			case 'user_joined':
				return 'text-green-600 italic';
			case 'user_left':
				return 'text-red-600 italic';
			default:
				return 'text-gray-800';
		}
	}
</script>

<div class="mx-auto max-w-4xl p-6">
	<h1 class="mb-6 text-3xl font-bold">Simple WebSocket Chat</h1>

	<!-- Connection Status -->
	<div class="mb-4 rounded-lg bg-gray-100 p-4">
		<div class="flex items-center gap-3">
			<div class="h-3 w-3 rounded-full {isConnected ? 'bg-green-500' : 'bg-red-500'}"></div>
			<span class="font-medium">
				{#if isConnected}
					Connected {isJoined ? `as ${username}` : ''}
				{:else}
					Disconnected
				{/if}
			</span>
		</div>

		{#if connectionError}
			<div class="mt-2 text-red-600">{connectionError}</div>
		{/if}
	</div>

	<!-- Connection Form -->
	{#if !isConnected}
		<div class="mb-6 rounded-lg border p-4">
			<h2 class="mb-3 text-xl font-semibold">Connect to Chat</h2>
			<div class="flex gap-3">
				<button
					onclick={connectToChat}
					disabled={isConnecting}
					class="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
				>
					{isConnecting ? 'Connecting...' : 'Connect to Chat'}
				</button>
			</div>
		</div>
	{:else if !isJoined}
		<!-- Username Form -->
		<div class="mb-6 rounded-lg border p-4">
			<h2 class="mb-3 text-xl font-semibold">Join Chat</h2>
			<div class="flex gap-3">
				<input
					bind:value={username}
					onkeypress={handleKeyPress}
					placeholder="Enter your username"
					class="flex-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
					disabled={isJoining}
				/>
				<button
					onclick={joinChat}
					disabled={isJoining || !username.trim()}
					class="rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:opacity-50"
				>
					{isJoining ? 'Joining...' : 'Join Chat'}
				</button>
			</div>
		</div>
	{:else}
		<!-- Chat Interface -->
		<div class="flex h-96 flex-col">
			<!-- Messages -->
			<div class="flex-1 overflow-y-auto rounded-lg border bg-white p-4">
				{#each messages as message (message.id)}
					<div class="mb-2">
						<span class="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
						{#if message.type === 'message'}
							<div>
								<span class="font-medium">{message.username}:</span>
								<span class="ml-2">{message.content}</span>
							</div>
						{:else}
							<div class={getMessageClass(message)}>
								{message.content || `${message.username} ${message.type.replace('user_', '')}`}
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Message Input -->
			<div class="mt-4">
				{#if sendError}
					<div class="mb-2 text-sm text-red-600">{sendError}</div>
				{/if}
				<div class="flex gap-3">
					<input
						bind:value={messageInput}
						onkeypress={handleKeyPress}
						placeholder="Type your message..."
						class="flex-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
						disabled={isSending}
					/>
					<button
						onclick={sendMessage}
						disabled={isSending || !messageInput.trim()}
						class="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
					>
						{isSending ? 'Sending...' : 'Send'}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Debug Info -->
	<div class="mt-6 rounded-lg bg-gray-50 p-4 text-sm">
		<h3 class="mb-2 font-semibold">Debug Info</h3>
		<div>WebSocket URL: {wsUrl}</div>
		<div>Messages received: {messages.length}</div>
		<div>Connection state: {isConnected ? 'Connected' : 'Disconnected'}</div>
		<div>Chat state: {isJoined ? 'Joined' : 'Not joined'}</div>
	</div>
</div>

