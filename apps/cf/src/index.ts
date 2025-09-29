import { DurableObject, WorkerEntrypoint } from 'cloudflare:workers';

// Import chat types from the web app (we'll need to copy these locally later)
interface ChatMessage {
	id: string;
	content: string;
	username: string;
	timestamp: number;
	type: 'message';
}

interface UserJoinedMessage {
	id: string;
	username: string;
	timestamp: number;
	type: 'user_joined';
}

interface UserLeftMessage {
	id: string;
	username: string;
	timestamp: number;
	type: 'user_left';
}

interface ServerMessage {
	id: string;
	content: string;
	timestamp: number;
	type: 'server';
}

type Message = ChatMessage | UserJoinedMessage | UserLeftMessage | ServerMessage;

interface SendMessage {
	type: 'send_message';
	content: string;
}

interface JoinChat {
	type: 'join_chat';
	username: string;
}

interface LeaveChat {
	type: 'leave_chat';
}

type ClientMessage = SendMessage | JoinChat | LeaveChat;

interface ChatUser {
	username: string;
	connectionId: string;
	joinedAt: number;
}

export class MyDurableObject extends DurableObject<Env> {
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
	}

	async sayHelloFromDO(): Promise<string> {
		return 'Hello from Durable Object';
	}
}

export class ChatRoom extends DurableObject<Env> {
	private sessions: Map<WebSocket, ChatUser>;
	private messageHistory: Message[];
	private readonly MAX_HISTORY = 50;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.sessions = new Map();
		this.messageHistory = [];

		// Restore any hibernating WebSockets
		this.ctx.getWebSockets().forEach((ws) => {
			const attachment = ws.deserializeAttachment();
			if (attachment) {
				this.sessions.set(ws, attachment as ChatUser);
			}
		});

		// Set up auto-response for ping/pong to keep connections alive
		this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
	}

	async fetch(request: Request): Promise<Response> {
		// Handle WebSocket upgrade requests
		if (request.headers.get('Upgrade') === 'websocket') {
			return this.handleWebSocketUpgrade(request);
		}

		// Handle regular HTTP requests (for potential REST API endpoints)
		const url = new URL(request.url);

		if (url.pathname === '/stats') {
			return new Response(
				JSON.stringify({
					connectedUsers: this.sessions.size,
					messageHistory: this.messageHistory.length,
				}),
				{
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		return new Response('Chat room endpoints: /stats for statistics, WebSocket upgrade for chat connection', {
			status: 200,
			headers: { 'Content-Type': 'text/plain' },
		});
	}

	private async handleWebSocketUpgrade(request: Request): Promise<Response> {
		const webSocketPair = new WebSocketPair();
		const [client, server] = Object.values(webSocketPair);

		// Accept the WebSocket connection using hibernation API
		this.ctx.acceptWebSocket(server);

		// Send connection confirmation
		server.send(
			JSON.stringify({
				id: crypto.randomUUID(),
				content: 'Connected to chat server',
				timestamp: Date.now(),
				type: 'server',
			}),
		);

		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	}

	async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
		const messageText = typeof message === 'string' ? message : new TextDecoder().decode(message);

		// Handle ping messages
		if (messageText === 'ping') {
			ws.send('pong');
			return;
		}

		try {
			const clientMessage: ClientMessage = JSON.parse(messageText);

			switch (clientMessage.type) {
				case 'join_chat':
					await this.handleUserJoin(ws, clientMessage.username);
					break;
				case 'send_message':
					await this.handleSendMessage(ws, clientMessage.content);
					break;
				case 'leave_chat':
					await this.handleUserLeave(ws);
					break;
				default:
					await this.sendError(ws, 'Unknown message type');
			}
		} catch (error) {
			console.error('Error handling WebSocket message:', error);
			await this.sendError(ws, 'Invalid message format');
		}
	}

	async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
		await this.handleUserLeave(ws);
	}

	private async handleUserJoin(ws: WebSocket, username: string): Promise<void> {
		// Validate username
		if (!username || typeof username !== 'string' || username.trim().length === 0) {
			await this.sendError(ws, 'Invalid username');
			return;
		}

		// Check if username is already taken
		const existingUser = Array.from(this.sessions.values()).find((user) => user.username === username);
		if (existingUser) {
			await this.sendError(ws, 'Username already taken');
			return;
		}

		// Create user and store in sessions
		const connectionId = crypto.randomUUID();
		const user: ChatUser = {
			username: username.trim(),
			connectionId,
			joinedAt: Date.now(),
		};

		this.sessions.set(ws, user);

		// Serialize user data to WebSocket for hibernation
		ws.serializeAttachment(user);

		// Send welcome message with recent history
		await this.sendToWebSocket(ws, {
			id: crypto.randomUUID(),
			content: `Welcome to the chat, ${user.username}!`,
			timestamp: Date.now(),
			type: 'server',
		});

		// Send recent message history
		for (const historyMessage of this.messageHistory.slice(-10)) {
			await this.sendToWebSocket(ws, historyMessage);
		}

		// Create and broadcast join message
		const joinMessage: UserJoinedMessage = {
			id: crypto.randomUUID(),
			username: user.username,
			timestamp: Date.now(),
			type: 'user_joined',
		};

		this.addToHistory(joinMessage);
		await this.broadcastMessage(joinMessage);
	}

	private async handleSendMessage(ws: WebSocket, content: string): Promise<void> {
		const user = this.sessions.get(ws);
		if (!user) {
			await this.sendError(ws, 'Not authenticated. Please join the chat first.');
			return;
		}

		if (!content || content.trim().length === 0) {
			await this.sendError(ws, 'Message cannot be empty');
			return;
		}

		// Create chat message
		const chatMessage: ChatMessage = {
			id: crypto.randomUUID(),
			content: content.trim(),
			username: user.username,
			timestamp: Date.now(),
			type: 'message',
		};

		this.addToHistory(chatMessage);
		await this.broadcastMessage(chatMessage);
	}

	private async handleUserLeave(ws: WebSocket): Promise<void> {
		const user = this.sessions.get(ws);
		if (user) {
			this.sessions.delete(ws);

			// Create and broadcast leave message
			const leaveMessage: UserLeftMessage = {
				id: crypto.randomUUID(),
				username: user.username,
				timestamp: Date.now(),
				type: 'user_left',
			};

			this.addToHistory(leaveMessage);
			await this.broadcastMessage(leaveMessage);
		}

		// Close the WebSocket
		ws.close(1000, 'User left chat');
	}

	private async broadcastMessage(message: Message): Promise<void> {
		const promises: Promise<void>[] = [];

		this.sessions.forEach((user, ws) => {
			promises.push(this.sendToWebSocket(ws, message));
		});

		await Promise.allSettled(promises);
	}

	private async sendToWebSocket(ws: WebSocket, message: Message): Promise<void> {
		try {
			ws.send(JSON.stringify(message));
		} catch (error) {
			console.error('Error sending WebSocket message:', error);
			// Remove broken connection
			this.sessions.delete(ws);
		}
	}

	private async sendError(ws: WebSocket, errorMessage: string): Promise<void> {
		const serverMessage: ServerMessage = {
			id: crypto.randomUUID(),
			content: `Error: ${errorMessage}`,
			timestamp: Date.now(),
			type: 'server',
		};

		await this.sendToWebSocket(ws, serverMessage);
	}

	private addToHistory(message: Message): void {
		this.messageHistory.push(message);

		// Keep only the most recent messages
		if (this.messageHistory.length > this.MAX_HISTORY) {
			this.messageHistory = this.messageHistory.slice(-this.MAX_HISTORY);
		}
	}
}

export class CFWorker extends WorkerEntrypoint<Env> {
	async sayHelloFromWorker(): Promise<string> {
		return 'Hello from Worker';
	}

	async sayHelloFromDO() {
		const stub = this.env.MY_DURABLE_OBJECT.getByName('rpc-test');
		return stub.sayHelloFromDO();
	}

	async getChatRoom(roomId: string = 'default') {
		const durableObjectId = this.env.CHAT_ROOM.idFromName(roomId);
		return this.env.CHAT_ROOM.get(durableObjectId);
	}

	async getChatRoomStats(roomId: string = 'default') {
		const chatRoom = await this.getChatRoom(roomId);
		const response = await chatRoom.fetch(new Request('http://localhost/stats'));
		return response.json();
	}

	// Handle direct fetch requests (including WebSocket upgrades)
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		// Handle WebSocket upgrade requests
		if (url.pathname === '/websocket' && request.headers.get('Upgrade') === 'websocket') {
			// Get room ID from query params or default to 'default'
			const roomId = url.searchParams.get('room') || 'default';
			const chatRoom = await this.getChatRoom(roomId);
			return chatRoom.fetch(request);
		}

		// Handle stats requests
		if (url.pathname === '/chat-stats') {
			const roomId = url.searchParams.get('room') || 'default';
			const stats = await this.getChatRoomStats(roomId);
			return new Response(JSON.stringify(stats), {
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Default response
		return new Response(
			`CF Worker is running!

Available endpoints:
- /websocket - WebSocket chat connection
- /chat-stats - Get chat room statistics
- RPC methods: sayHelloFromWorker, sayHelloFromDO, getChatRoom, getChatRoomStats`,
			{
				headers: { 'Content-Type': 'text/plain' },
			},
		);
	}
}

export default CFWorker;
