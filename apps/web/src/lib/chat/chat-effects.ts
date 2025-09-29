import { Effect, Stream, Data } from 'effect';
import type {
	Message,
	ClientMessage,
	ConnectionError,
	MessageError,
	ValidationError,
	ChatConnectionResult
} from './chat-types.js';

// WebSocket connection state
interface WebSocketConnection {
	socket: WebSocket;
	url: string;
	readyState: number;
}

// Effect utilities for WebSocket chat functionality
export const ChatEffects = {
	/**
	 * Creates a WebSocket connection as an Effect
	 */
	connect: (url: string): Effect.Effect<WebSocketConnection, ConnectionError> =>
		Effect.gen(function* () {
			try {
				const socket = new WebSocket(url);

				// Wait for connection to open
				yield* Effect.async<void, ConnectionError>((resume) => {
					const onOpen = () => {
						socket.removeEventListener('open', onOpen);
						socket.removeEventListener('error', onError);
						resume(Effect.void);
					};

					const onError = (event: Event) => {
						socket.removeEventListener('open', onOpen);
						socket.removeEventListener('error', onError);
						resume(Effect.fail(new ConnectionError({
							reason: 'Failed to connect to WebSocket',
							connectionId: undefined
						})));
					};

					socket.addEventListener('open', onOpen);
					socket.addEventListener('error', onError);
				});

				return {
					socket,
					url,
					readyState: socket.readyState
				};
			} catch (error) {
				return yield* Effect.fail(new ConnectionError({
					reason: `Connection failed: ${error}`,
					connectionId: undefined
				}));
			}
		}),

	/**
	 * Creates a stream of incoming WebSocket messages using Effect's Stream.async
	 */
	messageStream: (connection: WebSocketConnection): Stream.Stream<Message, MessageError> =>
		Stream.async<Message, MessageError>((emit) => {
			const handleMessage = (event: MessageEvent) => {
				try {
					const message: Message = JSON.parse(event.data);
					emit(Effect.succeed([message]));
				} catch (error) {
					emit(Effect.fail(new MessageError({
						reason: `Failed to parse message: ${error}`,
						messageContent: event.data
					})));
				}
			};

			const handleError = (event: Event) => {
				emit(Effect.fail(new MessageError({
					reason: 'WebSocket error occurred',
					messageContent: undefined
				})));
			};

			const handleClose = () => {
				// Signal end of stream with None
				emit(Effect.fail(new MessageError({
					reason: 'WebSocket connection closed',
					messageContent: undefined
				})));
			};

			connection.socket.addEventListener('message', handleMessage);
			connection.socket.addEventListener('error', handleError);
			connection.socket.addEventListener('close', handleClose);

			// Cleanup function
			return Effect.sync(() => {
				connection.socket.removeEventListener('message', handleMessage);
				connection.socket.removeEventListener('error', handleError);
				connection.socket.removeEventListener('close', handleClose);
			});
		}),

	/**
	 * Sends a message through WebSocket as an Effect
	 */
	sendMessage: (connection: WebSocketConnection) => (message: ClientMessage): Effect.Effect<void, MessageError> =>
		Effect.gen(function* () {
			if (connection.socket.readyState !== WebSocket.OPEN) {
				return yield* Effect.fail(new MessageError({
					reason: 'WebSocket is not connected',
					messageContent: JSON.stringify(message)
				}));
			}

			try {
				connection.socket.send(JSON.stringify(message));
			} catch (error) {
				return yield* Effect.fail(new MessageError({
					reason: `Failed to send message: ${error}`,
					messageContent: JSON.stringify(message)
				}));
			}
		}),

	/**
	 * Validates username
	 */
	validateUsername: (username: string): Effect.Effect<string, ValidationError> =>
		Effect.gen(function* () {
			if (!username || typeof username !== 'string') {
				return yield* Effect.fail(new ValidationError({
					field: 'username',
					value: username,
					reason: 'Username must be a non-empty string'
				}));
			}

			const trimmed = username.trim();
			if (trimmed.length === 0) {
				return yield* Effect.fail(new ValidationError({
					field: 'username',
					value: username,
					reason: 'Username cannot be empty'
				}));
			}

			if (trimmed.length > 30) {
				return yield* Effect.fail(new ValidationError({
					field: 'username',
					value: username,
					reason: 'Username cannot be longer than 30 characters'
				}));
			}

			if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
				return yield* Effect.fail(new ValidationError({
					field: 'username',
					value: username,
					reason: 'Username can only contain letters, numbers, underscores, and hyphens'
				}));
			}

			return trimmed;
		}),

	/**
	 * Validates message content
	 */
	validateMessage: (content: string): Effect.Effect<string, ValidationError> =>
		Effect.gen(function* () {
			if (!content || typeof content !== 'string') {
				return yield* Effect.fail(new ValidationError({
					field: 'message',
					value: content,
					reason: 'Message must be a non-empty string'
				}));
			}

			const trimmed = content.trim();
			if (trimmed.length === 0) {
				return yield* Effect.fail(new ValidationError({
					field: 'message',
					value: content,
					reason: 'Message cannot be empty'
				}));
			}

			if (trimmed.length > 500) {
				return yield* Effect.fail(new ValidationError({
					field: 'message',
					value: content,
					reason: 'Message cannot be longer than 500 characters'
				}));
			}

			return trimmed;
		}),

	/**
	 * Joins a chat room
	 */
	joinChat: (connection: WebSocketConnection, username: string): Effect.Effect<void, ValidationError | MessageError> =>
		Effect.gen(function* () {
			const validUsername = yield* ChatEffects.validateUsername(username);
			const joinMessage: ClientMessage = {
				type: 'join_chat',
				username: validUsername
			};
			yield* ChatEffects.sendMessage(connection)(joinMessage);
		}),

	/**
	 * Sends a chat message
	 */
	sendChatMessage: (connection: WebSocketConnection, content: string): Effect.Effect<void, ValidationError | MessageError> =>
		Effect.gen(function* () {
			const validContent = yield* ChatEffects.validateMessage(content);
			const chatMessage: ClientMessage = {
				type: 'send_message',
				content: validContent
			};
			yield* ChatEffects.sendMessage(connection)(chatMessage);
		}),

	/**
	 * Leaves the chat room
	 */
	leaveChat: (connection: WebSocketConnection): Effect.Effect<void, MessageError> =>
		Effect.gen(function* () {
			const leaveMessage: ClientMessage = {
				type: 'leave_chat'
			};
			yield* ChatEffects.sendMessage(connection)(leaveMessage);
		}),

	/**
	 * Closes WebSocket connection
	 */
	disconnect: (connection: WebSocketConnection): Effect.Effect<void, never> =>
		Effect.sync(() => {
			if (connection.socket.readyState === WebSocket.OPEN) {
				connection.socket.close(1000, 'User disconnecting');
			}
		}),

	/**
	 * Error handling utility - converts errors to user-friendly messages
	 */
	handleError: <E extends ConnectionError | MessageError | ValidationError>(error: E): Effect.Effect<string, never> =>
		Effect.succeed(() => {
			switch (error._tag) {
				case 'ConnectionError':
					return `Connection failed: ${error.reason}`;
				case 'MessageError':
					return `Message error: ${error.reason}`;
				case 'ValidationError':
					return `Invalid ${error.field}: ${error.reason}`;
				default:
					return 'An unknown error occurred';
			}
		}).pipe(Effect.map(fn => fn()))
};