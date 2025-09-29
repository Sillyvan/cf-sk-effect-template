import { Effect } from 'effect';
import { query, getRequestEvent } from '$app/server';
import { ChatEffects } from './chat-effects.js';
import type { ChatConnectionResult } from './chat-types.js';

// Server-side chat utilities using effectQuery pattern from the existing codebase

/**
 * Gets chat room statistics from the worker
 */
export const getChatRoomStats = query(async (roomId: string = 'default') => {
	const { platform } = getRequestEvent();

	try {
		const result = await platform!.env.CF_WORKER.getChatRoomStats(roomId);
		return {
			success: true,
			stats: result
		};
	} catch (error) {
		console.error('Failed to get chat room stats:', error);
		return {
			success: false,
			error: 'Failed to get chat room statistics'
		};
	}
});

/**
 * Client-side WebSocket connection builder
 * This returns the WebSocket URL that clients should connect to
 */
export const getChatWebSocketUrl = query(async (roomId: string = 'default') => {
	const { url } = getRequestEvent();

	// Convert HTTP/HTTPS to WS/WSS
	const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
	const wsUrl = `${protocol}//${url.host}/api/chat/ws?room=${encodeURIComponent(roomId)}`;

	return {
		wsUrl,
		roomId
	};
});

// Effect-based utilities for client-side usage
export const effectChatQuery = {
	/**
	 * Creates a WebSocket connection with Effect error handling
	 */
	connect: (wsUrl: string) =>
		ChatEffects.connect(wsUrl).pipe(
			Effect.catchTags({
				ConnectionError: (error) => Effect.succeed({
					success: false as const,
					error: error.reason
				})
			}),
			Effect.map(connection => ({
				success: true as const,
				connection
			}))
		),

	/**
	 * Joins a chat room with validation
	 */
	joinRoom: (connection: any, username: string) =>
		ChatEffects.joinChat(connection, username).pipe(
			Effect.catchTags({
				ValidationError: (error) => Effect.succeed({
					success: false as const,
					error: `Validation failed: ${error.reason}`
				}),
				MessageError: (error) => Effect.succeed({
					success: false as const,
					error: `Message error: ${error.reason}`
				})
			}),
			Effect.map(() => ({
				success: true as const
			}))
		),

	/**
	 * Sends a message with validation
	 */
	sendMessage: (connection: any, content: string) =>
		ChatEffects.sendChatMessage(connection, content).pipe(
			Effect.catchTags({
				ValidationError: (error) => Effect.succeed({
					success: false as const,
					error: `Validation failed: ${error.reason}`
				}),
				MessageError: (error) => Effect.succeed({
					success: false as const,
					error: `Message error: ${error.reason}`
				})
			}),
			Effect.map(() => ({
				success: true as const
			}))
		),

	/**
	 * Creates a message stream with error handling
	 */
	createMessageStream: (connection: any) =>
		ChatEffects.messageStream(connection).pipe(
			// Handle stream errors gracefully
			Effect.catchTags({
				MessageError: (error) => {
					console.error('Message stream error:', error.reason);
					// Could emit an error message to the UI
					return Effect.succeed({
						id: 'error-' + Date.now(),
						content: `Connection error: ${error.reason}`,
						timestamp: Date.now(),
						type: 'server' as const
					});
				}
			})
		)
};