import { Effect, Stream, Chunk, Option, Schema } from 'effect';
import type { Message, ClientMessage } from './chat-types.js';
import {
	UsernameSchema,
	MessageContentSchema,
	ConnectionError,
	MessageError
} from './chat-types.js';

// Effect utilities for WebSocket chat functionality
export const ChatEffects = {
	/**
	 * Creates a WebSocket connection as an Effect
	 */
	connect: (url: string): Effect.Effect<WebSocket, ConnectionError> =>
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

					const onError = () => {
						socket.removeEventListener('open', onOpen);
						socket.removeEventListener('error', onError);
						resume(
							Effect.fail(
								new ConnectionError({
									reason: 'Failed to connect to WebSocket',
									connectionId: undefined
								})
							)
						);
					};

					socket.addEventListener('open', onOpen);
					socket.addEventListener('error', onError);
				});

				return socket;
			} catch (error) {
				return yield* Effect.fail(
					new ConnectionError({
						reason: `Connection failed: ${error}`,
						connectionId: undefined
					})
				);
			}
		}),

	/**
	 * Creates a stream of incoming WebSocket messages using Effect's Stream.async
	 */
	messageStream: (socket: WebSocket): Stream.Stream<Message, MessageError> =>
		Stream.async<Message, MessageError>((emit) => {
			const handleMessage = (event: MessageEvent) => {
				try {
					const message: Message = JSON.parse(event.data);
					emit(Effect.succeed(Chunk.of(message)));
				} catch (error) {
					emit(
						Effect.fail(
							Option.some(
								new MessageError({
									reason: `Failed to parse message: ${error}`,
									messageContent: event.data
								})
							)
						)
					);
				}
			};

			const handleError = () => {
				emit(
					Effect.fail(
						Option.some(
							new MessageError({
								reason: 'WebSocket error occurred',
								messageContent: undefined
							})
						)
					)
				);
			};

			const handleClose = (event: CloseEvent) => {
				// Signal end of stream properly
				if (event.code === 1000) {
					// Normal closure
					emit(Effect.fail(Option.none()));
				} else {
					// Error closure
					emit(
						Effect.fail(
							Option.some(
								new MessageError({
									reason: `WebSocket connection closed: ${event.code} ${event.reason}`,
									messageContent: undefined
								})
							)
						)
					);
				}
			};

			socket.addEventListener('message', handleMessage);
			socket.addEventListener('error', handleError);
			socket.addEventListener('close', handleClose);

			// Cleanup function
			return Effect.sync(() => {
				socket.removeEventListener('message', handleMessage);
				socket.removeEventListener('error', handleError);
				socket.removeEventListener('close', handleClose);
			});
		}),

	/**
	 * Sends a message through WebSocket as an Effect
	 */
	sendMessage:
		(socket: WebSocket) =>
		(message: ClientMessage): Effect.Effect<void, MessageError> =>
			Effect.gen(function* () {
				if (socket.readyState !== WebSocket.OPEN) {
					return yield* Effect.fail(
						new MessageError({
							reason: 'WebSocket is not connected',
							messageContent: JSON.stringify(message)
						})
					);
				}

				try {
					socket.send(JSON.stringify(message));
				} catch (error) {
					return yield* Effect.fail(
						new MessageError({
							reason: `Failed to send message: ${error}`,
							messageContent: JSON.stringify(message)
						})
					);
				}
			}),

	/**
	 * Validates username using Effect Schema
	 */
	validateUsername: (username: string): Effect.Effect<string, MessageError> =>
		Schema.decode(UsernameSchema)(username.trim()).pipe(
			Effect.mapError(
				(error) =>
					new MessageError({
						reason: error.message,
						messageContent: username
					})
			)
		),

	/**
	 * Validates message content using Effect Schema
	 */
	validateMessage: (content: string): Effect.Effect<string, MessageError> =>
		Schema.decode(MessageContentSchema)(content.trim()).pipe(
			Effect.mapError(
				(error) =>
					new MessageError({
						reason: error.message,
						messageContent: content
					})
			)
		),

	/**
	 * Joins a chat room
	 */
	joinChat: (socket: WebSocket, username: string): Effect.Effect<void, MessageError> =>
		Effect.gen(function* () {
			const validUsername = yield* ChatEffects.validateUsername(username);
			const joinMessage: ClientMessage = {
				type: 'join_chat',
				username: validUsername
			};
			yield* ChatEffects.sendMessage(socket)(joinMessage);
		}),

	/**
	 * Sends a chat message
	 */
	sendChatMessage: (socket: WebSocket, content: string): Effect.Effect<void, MessageError> =>
		Effect.gen(function* () {
			const validContent = yield* ChatEffects.validateMessage(content);
			const chatMessage: ClientMessage = {
				type: 'send_message',
				content: validContent
			};
			yield* ChatEffects.sendMessage(socket)(chatMessage);
		}),

	/**
	 * Leaves the chat room
	 */
	leaveChat: (socket: WebSocket): Effect.Effect<void, MessageError> =>
		Effect.gen(function* () {
			const leaveMessage: ClientMessage = {
				type: 'leave_chat'
			};
			yield* ChatEffects.sendMessage(socket)(leaveMessage);
		}),

	/**
	 * Closes WebSocket connection
	 */
	disconnect: (socket: WebSocket): Effect.Effect<void, never> =>
		Effect.sync(() => {
			if (socket.readyState === WebSocket.OPEN) {
				socket.close(1000, 'User disconnecting');
			}
		}),

	/**
	 * Error handling utility - converts errors to user-friendly messages
	 */
	handleError: <E extends ConnectionError | MessageError>(error: E): Effect.Effect<string, never> =>
		Effect.succeed(() => {
			switch (error._tag) {
				case 'ConnectionError':
					return `Connection failed: ${error.reason}`;
				case 'MessageError':
					return `Message error: ${error.reason}`;
				default:
					return 'An unknown error occurred';
			}
		}).pipe(Effect.map((fn) => fn()))
};
