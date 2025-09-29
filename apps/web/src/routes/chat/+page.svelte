<script lang="ts">
	import { Effect, Stream, Either } from 'effect';
	import { ChatEffects } from '$lib/chat/chat-effects.js';
	import type { Message } from '$lib/chat/chat-types.js';
	import { browser, dev } from '$app/environment';

	// Consolidated chat state using Svelte 5 runes
	let chatState = $state({
		messages: [] as Message[],
		socket: null as WebSocket | null,
		isConnected: false,
		isJoined: false,
		connectionError: '',
		sendError: ''
	});

	// Form state
	let formState = $state({
		username: '',
		messageInput: '',
		isConnecting: false,
		isJoining: false,
		isSending: false
	});

	// Derived state for UI
	let canConnect = $derived(!formState.isConnecting && !chatState.isConnected);
	let canJoin = $derived(
		chatState.isConnected &&
			!chatState.isJoined &&
			!formState.isJoining &&
			formState.username.trim().length > 0
	);
	let canSendMessage = $derived(
		chatState.isJoined && !formState.isSending && formState.messageInput.trim().length > 0
	);
	let connectionStatusText = $derived.by(() => {
		if (chatState.isConnected) {
			return chatState.isJoined ? `Connected as ${formState.username}` : 'Connected';
		}
		return 'Disconnected';
	});

	// WebSocket URL - derived from environment
	let wsUrl = $derived.by(() => {
		if (!browser) return '';
		if (dev) {
			// Local development - connect to worker dev server
			return 'ws://localhost:8787/websocket';
		} else {
			// Production - update this to your worker's URL
			return 'wss://cf-sk-effect-template-worker.silvan-gehrig.workers.dev/websocket';
		}
	});

	// Cleanup effect
	$effect(() => {
		return () => {
			if (chatState.socket) {
				Effect.runSync(ChatEffects.disconnect(chatState.socket));
			}
		};
	});

	async function connectToChat() {
		if (!wsUrl) return;

		formState.isConnecting = true;
		chatState.connectionError = '';

		try {
			const connectResult = await Effect.runPromise(Effect.either(ChatEffects.connect(wsUrl)));

			if (Either.isRight(connectResult)) {
				chatState.socket = connectResult.right;
				chatState.isConnected = true;
				// Message stream will start automatically via $effect
			} else {
				chatState.connectionError = connectResult.left.reason;
			}
		} catch (error) {
			chatState.connectionError = `Failed to connect: ${error}`;
		} finally {
			formState.isConnecting = false;
		}
	}

	// Effect to manage message stream when socket is established
	$effect(() => {
		if (!chatState.socket) return;

		// Use Effect stream to consume messages
		const streamEffect = ChatEffects.messageStream(chatState.socket).pipe(
			Stream.tap((message) => {
				// Add message to state
				chatState.messages = [...chatState.messages, message];
				return Effect.void;
			}),
			Stream.runDrain,
			Effect.catchTags({
				MessageError: (error) => {
					// Handle stream errors
					if (error.reason.includes('connection closed')) {
						chatState.isConnected = false;
						chatState.socket = null;
					} else {
						chatState.connectionError = error.reason;
					}
					return Effect.void;
				}
			})
		);

		// Run the stream effect
		Effect.runPromise(streamEffect).catch((error) => {
			// Handle any uncaught errors
			console.error('Message stream error:', error);
			chatState.connectionError = 'Message stream error occurred';
		});
	});

	async function joinChat() {
		if (!chatState.socket || !formState.username.trim()) return;

		formState.isJoining = true;
		chatState.connectionError = '';

		try {
			const joinResult = await Effect.runPromise(
				Effect.either(ChatEffects.joinChat(chatState.socket, formState.username.trim()))
			);

			if (Either.isRight(joinResult)) {
				chatState.isJoined = true;
			} else {
				const error = joinResult.left;
				if (error._tag === 'MessageError') {
					chatState.connectionError = `Message error: ${error.reason}`;
				} else {
					chatState.connectionError = 'Unknown error occurred';
				}
			}
		} catch (error) {
			chatState.connectionError = `Failed to join: ${error}`;
		} finally {
			formState.isJoining = false;
		}
	}

	async function sendMessage() {
		if (!chatState.socket || !formState.messageInput.trim()) return;

		formState.isSending = true;
		chatState.sendError = '';

		try {
			const sendResult = await Effect.runPromise(
				Effect.either(ChatEffects.sendChatMessage(chatState.socket, formState.messageInput.trim()))
			);

			if (Either.isRight(sendResult)) {
				formState.messageInput = '';
			} else {
				const error = sendResult.left;
				if (error._tag === 'MessageError') {
					chatState.sendError = `Message error: ${error.reason}`;
				} else {
					chatState.sendError = 'Unknown error occurred';
				}
			}
		} catch (error) {
			chatState.sendError = `Failed to send message: ${error}`;
		} finally {
			formState.isSending = false;
		}
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			if (chatState.isJoined) {
				sendMessage();
			} else if (chatState.isConnected) {
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
			<div
				class="h-3 w-3 rounded-full {chatState.isConnected ? 'bg-green-500' : 'bg-red-500'}"
			></div>
			<span class="font-medium">{connectionStatusText}</span>
		</div>

		{#if chatState.connectionError}
			<div class="mt-2 text-red-600">{chatState.connectionError}</div>
		{/if}
	</div>

	<!-- Connection Form -->
	{#if !chatState.isConnected}
		<div class="mb-6 rounded-lg border p-4">
			<h2 class="mb-3 text-xl font-semibold">Connect to Chat</h2>
			<div class="flex gap-3">
				<button
					onclick={connectToChat}
					disabled={!canConnect}
					class="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
				>
					{formState.isConnecting ? 'Connecting...' : 'Connect to Chat'}
				</button>
			</div>
		</div>
	{:else if !chatState.isJoined}
		<!-- Username Form -->
		<div class="mb-6 rounded-lg border p-4">
			<h2 class="mb-3 text-xl font-semibold">Join Chat</h2>
			<div class="flex gap-3">
				<input
					bind:value={formState.username}
					onkeypress={handleKeyPress}
					placeholder="Enter your username"
					class="flex-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
					disabled={formState.isJoining}
				/>
				<button
					onclick={joinChat}
					disabled={!canJoin}
					class="rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:opacity-50"
				>
					{formState.isJoining ? 'Joining...' : 'Join Chat'}
				</button>
			</div>
		</div>
	{:else}
		<!-- Chat Interface -->
		<div class="flex h-96 flex-col">
			<!-- Messages -->
			<div class="flex-1 overflow-y-auto rounded-lg border bg-white p-4">
				{#each chatState.messages as message (message.id)}
					<div class="mb-2">
						<span class="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
						{#if message.type === 'message'}
							<div>
								<span class="font-medium">{message.username}:</span>
								<span class="ml-2">{message.content}</span>
							</div>
						{:else}
							<div class={getMessageClass(message)}>
								{'content' in message
									? message.content
									: 'username' in message
										? `${message.username} ${message.type.replace('user_', '')}`
										: 'Unknown event'}
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Message Input -->
			<div class="mt-4">
				{#if chatState.sendError}
					<div class="mb-2 text-sm text-red-600">{chatState.sendError}</div>
				{/if}
				<div class="flex gap-3">
					<input
						bind:value={formState.messageInput}
						onkeypress={handleKeyPress}
						placeholder="Type your message..."
						class="flex-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
						disabled={formState.isSending}
					/>
					<button
						onclick={sendMessage}
						disabled={!canSendMessage}
						class="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
					>
						{formState.isSending ? 'Sending...' : 'Send'}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Debug Info -->
	<div class="mt-6 rounded-lg bg-gray-50 p-4 text-sm">
		<h3 class="mb-2 font-semibold">Debug Info</h3>
		<div>WebSocket URL: {wsUrl}</div>
		<div>Messages received: {chatState.messages.length}</div>
		<div>Connection state: {chatState.isConnected ? 'Connected' : 'Disconnected'}</div>
		<div>Chat state: {chatState.isJoined ? 'Joined' : 'Not joined'}</div>
	</div>
</div>
