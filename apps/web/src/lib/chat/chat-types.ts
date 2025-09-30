import { Data, Schema } from 'effect';

// Validation Schemas
export const UsernameSchema = Schema.String.pipe(
	Schema.nonEmptyString(),
	Schema.maxLength(30),
	Schema.pattern(/^[a-zA-Z0-9_-]+$/)
).annotations({
	identifier: 'Username',
	message: () => ({
		message: 'Username can only contain letters, numbers, underscores, and hyphens',
		override: true
	})
});

export const MessageContentSchema = Schema.String.pipe(
	Schema.nonEmptyString(),
	Schema.maxLength(500)
).annotations({
	identifier: 'MessageContent'
});

// Message Schemas
export const ChatMessageSchema = Schema.Struct({
	id: Schema.String,
	content: Schema.String,
	username: Schema.String,
	timestamp: Schema.Number,
	type: Schema.Literal('message')
});

export const UserJoinedMessageSchema = Schema.Struct({
	id: Schema.String,
	username: Schema.String,
	timestamp: Schema.Number,
	type: Schema.Literal('user_joined')
});

export const UserLeftMessageSchema = Schema.Struct({
	id: Schema.String,
	username: Schema.String,
	timestamp: Schema.Number,
	type: Schema.Literal('user_left')
});

export const ServerMessageSchema = Schema.Struct({
	id: Schema.String,
	content: Schema.String,
	timestamp: Schema.Number,
	type: Schema.Literal('server')
});

export const MessageSchema = Schema.Union(
	ChatMessageSchema,
	UserJoinedMessageSchema,
	UserLeftMessageSchema,
	ServerMessageSchema
);

// Client-to-Server Message Schemas
export const SendMessageSchema = Schema.Struct({
	type: Schema.Literal('send_message'),
	content: MessageContentSchema
});

export const JoinChatSchema = Schema.Struct({
	type: Schema.Literal('join_chat'),
	username: UsernameSchema
});

export const LeaveChatSchema = Schema.Struct({
	type: Schema.Literal('leave_chat')
});

export const ClientMessageSchema = Schema.Union(SendMessageSchema, JoinChatSchema, LeaveChatSchema);

// Connection State Schemas
export const ChatUserSchema = Schema.Struct({
	username: Schema.String,
	connectionId: Schema.String,
	joinedAt: Schema.Number
});

export const ChatConnectionResultSchema = Schema.Struct({
	success: Schema.Boolean,
	connectionId: Schema.optional(Schema.String),
	error: Schema.optional(Schema.String)
});

// Inferred Types
export type Username = Schema.Schema.Type<typeof UsernameSchema>;
export type MessageContent = Schema.Schema.Type<typeof MessageContentSchema>;
export type ChatMessage = Schema.Schema.Type<typeof ChatMessageSchema>;
export type UserJoinedMessage = Schema.Schema.Type<typeof UserJoinedMessageSchema>;
export type UserLeftMessage = Schema.Schema.Type<typeof UserLeftMessageSchema>;
export type ServerMessage = Schema.Schema.Type<typeof ServerMessageSchema>;
export type Message = Schema.Schema.Type<typeof MessageSchema>;
export type SendMessage = Schema.Schema.Type<typeof SendMessageSchema>;
export type JoinChat = Schema.Schema.Type<typeof JoinChatSchema>;
export type LeaveChat = Schema.Schema.Type<typeof LeaveChatSchema>;
export type ClientMessage = Schema.Schema.Type<typeof ClientMessageSchema>;
export type ChatUser = Schema.Schema.Type<typeof ChatUserSchema>;
export type ChatConnectionResult = Schema.Schema.Type<typeof ChatConnectionResultSchema>;

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
