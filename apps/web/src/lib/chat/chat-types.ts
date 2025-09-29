import { Data } from 'effect';

// Message Types
export interface ChatMessage {
	id: string;
	content: string;
	username: string;
	timestamp: number;
	type: 'message';
}

export interface UserJoinedMessage {
	id: string;
	username: string;
	timestamp: number;
	type: 'user_joined';
}

export interface UserLeftMessage {
	id: string;
	username: string;
	timestamp: number;
	type: 'user_left';
}

export interface ServerMessage {
	id: string;
	content: string;
	timestamp: number;
	type: 'server';
}

export type Message = ChatMessage | UserJoinedMessage | UserLeftMessage | ServerMessage;

// Client-to-Server Message Types
export interface SendMessage {
	type: 'send_message';
	content: string;
}

export interface JoinChat {
	type: 'join_chat';
	username: string;
}

export interface LeaveChat {
	type: 'leave_chat';
}

export type ClientMessage = SendMessage | JoinChat | LeaveChat;

// Connection State
export interface ChatUser {
	username: string;
	connectionId: string;
	joinedAt: number;
}

export interface ChatRoomState {
	users: Map<WebSocket, ChatUser>;
	messageHistory: Message[];
	userCount: number;
}

// Chat Result Types
export interface ChatConnectionResult {
	success: boolean;
	connectionId?: string;
	error?: string;
}

// Tagged Errors following existing codebase patterns
export class ConnectionError extends Data.TaggedError('ConnectionError')<{
	reason: string;
	connectionId?: string;
}> {}

export class MessageError extends Data.TaggedError('MessageError')<{
	reason: string;
	messageContent?: string;
	username?: string;
}> {}

export class ValidationError extends Data.TaggedError('ValidationError')<{
	field: string;
	value: unknown;
	reason: string;
}> {}

export class ChatRoomError extends Data.TaggedError('ChatRoomError')<{
	operation: string;
	reason: string;
}> {}