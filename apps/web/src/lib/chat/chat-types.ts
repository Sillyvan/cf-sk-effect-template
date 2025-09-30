import { Data } from 'effect';
import * as v from 'valibot';

// Validation Schemas
export const UsernameSchema = v.pipe(
	v.string('Username must be a string'),
	v.nonEmpty('Username cannot be empty'),
	v.maxLength(30, 'Username cannot be longer than 30 characters'),
	v.regex(
		/^[a-zA-Z0-9_-]+$/,
		'Username can only contain letters, numbers, underscores, and hyphens'
	)
);

export const MessageContentSchema = v.pipe(
	v.string('Message must be a string'),
	v.nonEmpty('Message cannot be empty'),
	v.maxLength(500, 'Message cannot be longer than 500 characters')
);

// Message Schemas
export const ChatMessageSchema = v.object({
	id: v.string(),
	content: v.string(),
	username: v.string(),
	timestamp: v.number(),
	type: v.literal('message')
});

export const UserJoinedMessageSchema = v.object({
	id: v.string(),
	username: v.string(),
	timestamp: v.number(),
	type: v.literal('user_joined')
});

export const UserLeftMessageSchema = v.object({
	id: v.string(),
	username: v.string(),
	timestamp: v.number(),
	type: v.literal('user_left')
});

export const ServerMessageSchema = v.object({
	id: v.string(),
	content: v.string(),
	timestamp: v.number(),
	type: v.literal('server')
});

export const MessageSchema = v.variant('type', [
	ChatMessageSchema,
	UserJoinedMessageSchema,
	UserLeftMessageSchema,
	ServerMessageSchema
]);

// Client-to-Server Message Schemas
export const SendMessageSchema = v.object({
	type: v.literal('send_message'),
	content: MessageContentSchema
});

export const JoinChatSchema = v.object({
	type: v.literal('join_chat'),
	username: UsernameSchema
});

export const LeaveChatSchema = v.object({
	type: v.literal('leave_chat')
});

export const ClientMessageSchema = v.variant('type', [
	SendMessageSchema,
	JoinChatSchema,
	LeaveChatSchema
]);

// Connection State Schemas
export const ChatUserSchema = v.object({
	username: v.string(),
	connectionId: v.string(),
	joinedAt: v.number()
});

export const ChatConnectionResultSchema = v.object({
	success: v.boolean(),
	connectionId: v.optional(v.string()),
	error: v.optional(v.string())
});

// Inferred Types
export type Username = v.InferOutput<typeof UsernameSchema>;
export type MessageContent = v.InferOutput<typeof MessageContentSchema>;
export type ChatMessage = v.InferOutput<typeof ChatMessageSchema>;
export type UserJoinedMessage = v.InferOutput<typeof UserJoinedMessageSchema>;
export type UserLeftMessage = v.InferOutput<typeof UserLeftMessageSchema>;
export type ServerMessage = v.InferOutput<typeof ServerMessageSchema>;
export type Message = v.InferOutput<typeof MessageSchema>;
export type SendMessage = v.InferOutput<typeof SendMessageSchema>;
export type JoinChat = v.InferOutput<typeof JoinChatSchema>;
export type LeaveChat = v.InferOutput<typeof LeaveChatSchema>;
export type ClientMessage = v.InferOutput<typeof ClientMessageSchema>;
export type ChatUser = v.InferOutput<typeof ChatUserSchema>;
export type ChatConnectionResult = v.InferOutput<typeof ChatConnectionResultSchema>;

// Chat Room State (keeping Map-based for WebSocket keys)
export interface ChatRoomState {
	users: Map<WebSocket, ChatUser>;
	messageHistory: Message[];
	userCount: number;
}

// Simplified Error Types
export class ConnectionError extends Data.TaggedError('ConnectionError')<{
	reason: string;
	connectionId?: string;
}> {}

export class MessageError extends Data.TaggedError('MessageError')<{
	reason: string;
	messageContent?: string;
}> {}

export class ChatRoomError extends Data.TaggedError('ChatRoomError')<{
	operation: string;
	reason: string;
}> {}
