import { Effect, Context, Layer, Stream } from 'effect';
import type { Message, ClientMessage } from './chat-types.js';
import { ConnectionError, MessageError } from './chat-types.js';

/**
 * ChatService - A service for managing WebSocket chat connections
 */
export class ChatService extends Context.Tag('ChatService')<
	ChatService,
	{
		/**
		 * Connect to a WebSocket URL
		 */
		readonly connect: (url: string) => Effect.Effect<WebSocket, ConnectionError>;

		/**
		 * Create a stream of messages from a WebSocket
		 */
		readonly messageStream: (socket: WebSocket) => Stream.Stream<Message, MessageError>;

		/**
		 * Send a message through a WebSocket
		 */
		readonly sendMessage: (
			socket: WebSocket
		) => (message: ClientMessage) => Effect.Effect<void, MessageError>;

		/**
		 * Join a chat room
		 */
		readonly joinChat: (
			socket: WebSocket,
			username: string
		) => Effect.Effect<void, MessageError>;

		/**
		 * Send a chat message
		 */
		readonly sendChatMessage: (
			socket: WebSocket,
			content: string
		) => Effect.Effect<void, MessageError>;

		/**
		 * Leave a chat room
		 */
		readonly leaveChat: (socket: WebSocket) => Effect.Effect<void, MessageError>;

		/**
		 * Disconnect from WebSocket
		 */
		readonly disconnect: (socket: WebSocket) => Effect.Effect<void, never>;

		/**
		 * Handle errors with user-friendly messages
		 */
		readonly handleError: <E extends ConnectionError | MessageError>(
			error: E
		) => Effect.Effect<string, never>;
	}
>() {}

/**
 * ValidationService - A service for validating chat-related data using Valibot
 */
export class ValidationService extends Context.Tag('ValidationService')<
	ValidationService,
	{
		/**
		 * Validate username
		 */
		readonly validateUsername: (username: string) => Effect.Effect<string, MessageError>;

		/**
		 * Validate message content
		 */
		readonly validateMessage: (content: string) => Effect.Effect<string, MessageError>;
	}
>() {}