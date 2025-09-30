# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Cloudflare + SvelteKit + Effect.ts template** built on Turborepo. It demonstrates production-ready patterns for building type-safe, composable applications using:

- **SvelteKit** with Cloudflare Pages adapter
- **Effect.ts** for functional, composable error handling and dependency injection
- **Cloudflare Workers & Durable Objects** for backend services
- **Effect Schema** for runtime validation and transformations
- **SvelteKit Remote Functions** for type-safe client-server communication

## Project Structure

This is a Turborepo monorepo with:

### Applications

- **apps/web** - SvelteKit application with Cloudflare Pages deployment
  - Main frontend application
  - Demonstrates Effect integration with SvelteKit
  - WebSocket chat client
  - Remote functions for server-side logic

- **apps/cf** - Cloudflare Worker with Durable Objects
  - Backend Worker with RPC entrypoint
  - Durable Objects (MyDurableObject, ChatRoom)
  - WebSocket chat server
  - Bound to web app via Service Bindings

### Packages

- **packages/rate-limiter** - Effect-based rate limiter
  - Wraps Cloudflare Rate Limiters in Effect
  - Type-safe error handling with Tagged Errors
  - Used in web app remote functions

### Key Technologies

- **Package Manager**: pnpm (required, specified in package.json)
- **Node Version**: >= 24 (specified in engines)
- **Monorepo**: Turborepo for task orchestration
- **Build Tool**: Rolldown (via `rolldown-vite`)
- **Styling**: TailwindCSS v4
- **Runtime Validation**: Effect Schema
- **Effect Version**: Managed via pnpm catalog (v3.17.14)

## Development Commands

### Repository Root Commands

```bash
# Start development for all apps (web + cf worker)
pnpm dev

# Build all apps and packages
pnpm build

# Lint all apps and packages
pnpm lint

# Format code across monorepo
pnpm format

# Type check all packages
pnpm check-types
```

### Web App Commands (apps/web)

```bash
# Development server
pnpm dev
# or with filter from root:
turbo dev --filter=web

# Build for production
pnpm build

# Preview build locally with Wrangler
pnpm preview

# Deploy to Cloudflare Pages
pnpm deploy

# Type checking and linting
pnpm check
pnpm check:watch
pnpm lint

# Generate Cloudflare Worker types
pnpm cf-typegen
```

### Cloudflare Worker Commands (apps/cf)

```bash
# Development server
pnpm dev

# Deploy to Cloudflare
pnpm deploy

# Generate types
pnpm cf-typegen
```

## Important Files

### Configuration Files

- `turbo.json` - Turborepo task dependencies and caching
- `pnpm-workspace.yaml` - Workspace configuration with Effect catalog
- `apps/web/svelte.config.js` - SvelteKit config with Cloudflare adapter and remote functions
- `apps/web/vite.config.ts` - Vite config with TailwindCSS v4 and Rolldown
- `apps/web/wrangler.jsonc` - Cloudflare bindings (Rate Limiters, Service Bindings)
- `apps/cf/wrangler.jsonc` - Cloudflare Worker config with Durable Objects

### Type Definitions

- `apps/web/src/app.d.ts` - SvelteKit type definitions with Cloudflare platform
- `apps/web/src/worker-configuration.d.ts` - Auto-generated Cloudflare types (do not edit manually)

### Key Source Files

- `packages/rate-limiter/src/index.ts` - Rate limiter Effect wrapper
- `apps/web/src/lib/chat/` - Chat service layer architecture
- `apps/cf/src/index.ts` - Cloudflare Worker with Durable Objects

## Effect Integration Patterns

This project demonstrates excellent patterns for integrating Effect with SvelteKit. See `EFFECT_IMPROVEMENTS.md` for detailed architectural explanations.

### Service Layer Architecture

The chat implementation showcases a clean service layer pattern:

**File Structure:**
```
apps/web/src/lib/chat/
├── chat-service.ts    # Service tags (Context.Tag definitions)
├── chat-layers.ts     # Service implementations (Layer definitions)
├── chat-types.ts      # Types, schemas, and tagged errors
└── chat-effects.ts    # Higher-level compositions
```

**Pattern:**
```typescript
// 1. Define service tags (chat-service.ts)
export class ChatService extends Context.Tag('ChatService')<
  ChatService,
  {
    readonly connect: (url: string) => Effect.Effect<WebSocket, ConnectionError>;
    // ... other methods
  }
>() {}

// 2. Implement services (chat-layers.ts)
export const ChatServiceLive = Layer.effect(
  ChatService,
  Effect.gen(function* () {
    const validation = yield* ValidationService;  // Dependency injection
    return ChatService.of({
      connect: (url: string) => Effect.gen(function* () {
        // Implementation
      })
    });
  })
);

// 3. Compose layers
export const ChatAppLive = Layer.provide(ChatServiceLive, ValidationServiceLive);

// 4. Use in code
const program = Effect.gen(function* () {
  const chat = yield* ChatService;
  const socket = yield* chat.connect('ws://...');
});

Effect.runPromise(Effect.provide(program, ChatAppLive));
```

### Tagged Errors

Use `Data.TaggedError` for type-safe error handling:

```typescript
// Define errors (chat-types.ts, rate-limiter)
export class ConnectionError extends Data.TaggedError('ConnectionError')<{
  reason: string;
  connectionId?: string;
}> {}

export class RateLimitExceededError extends Data.TaggedError('RateLimitExceeded')<{
  key: string;
  limit?: number;
  period?: number;
}> {}

// Handle errors with catchTags
const program = Effect.gen(function* () {
  yield* checkRateLimit(limiter, key);
  yield* connectToChat(url);
}).pipe(
  Effect.catchTags({
    RateLimitExceeded: (error) => Effect.succeed({
      error: `Rate limited: ${error.key}`
    }),
    ConnectionError: (error) => Effect.succeed({
      error: `Connection failed: ${error.reason}`
    })
  })
);
```

### Effect Streams

For WebSocket message handling, use Effect Streams:

```typescript
// Create stream from WebSocket (chat-layers.ts)
messageStream: (socket: WebSocket): Stream.Stream<Message, MessageError> =>
  Stream.async<Message, MessageError>((emit) => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const message: Message = JSON.parse(event.data);
        emit(Effect.succeed(Chunk.of(message)));
      } catch (error) {
        emit(Effect.fail(Option.some(new MessageError({ /* ... */ }))));
      }
    };

    socket.addEventListener('message', handleMessage);

    return Effect.sync(() => {
      socket.removeEventListener('message', handleMessage);
    });
  })
```

### Effect.gen Pattern

Use `Effect.gen` consistently for composable async operations:

```typescript
// Good: Composable, error-typed
const loadData = Effect.gen(function* () {
  const user = yield* getUser();
  const posts = yield* getPosts(user.id);
  return { user, posts };
});

// Avoid: Direct Promise usage loses Effect benefits
const loadData = async () => {
  const user = await getUser();
  const posts = await getPosts(user.id);
  return { user, posts };
};
```

## SvelteKit Remote Functions

This project uses SvelteKit's experimental remote functions feature for type-safe client-server communication.

**Enable in svelte.config.js:**
```javascript
kit: {
  experimental: {
    remoteFunctions: true
  }
}
```

### Three Primitives

#### 1. Query - Read Operations

```typescript
// File: routes/load.remote.ts
import { query } from '$app/server';

export const loadItems = query(v.number(), async (offset) => {
  // Logic here
  return { items, hasMore, total, offset };
});

// Usage in .svelte files
import { loadItems } from './load.remote';
const result = await loadItems(0);
```

#### 2. Command - Write Operations

```typescript
// File: routes/command.remote.ts
import { command, getRequestEvent } from '$app/server';

export const commandTest = command(async () => {
  const { platform } = getRequestEvent();

  const program = Effect.gen(function* () {
    // Access platform bindings
    yield* checkRateLimit(platform!.env.MY_RATE_LIMITER, 'key');
    return { success: true };
  }).pipe(Effect.catchTags({ /* error handling */ }));

  return await Effect.runPromise(program);
});
```

#### 3. Form - Form Actions with Validation

```typescript
// File: routes/form.remote.ts
import { form } from '$app/server';

export const formSchema = v.object({
  name: v.pipe(v.string(), v.minLength(2)),
  age: v.pipe(v.string(), v.transform(Number), v.number())
});

export const formTest = form(formSchema, async ({ name, age }) => {
  // Validated data
  const program = Effect.gen(function* () {
    yield* Effect.logInfo(`${name} ${age}`);
  });

  Effect.runFork(program);
});
```

### Effect Integration with Remote Functions

**Pattern:**
```typescript
export const myQuery = query(async () => {
  const program = Effect.gen(function* () {
    // Effect operations
    yield* someEffect;
    return result;
  }).pipe(
    Effect.catchTags({ /* handle errors */ })
  );

  return await Effect.runPromise(program);
});
```

## Rate Limiter Package

The `@repo/rate-limiter` package provides Effect-based wrappers for Cloudflare Rate Limiters.

### Installation

```json
// apps/web/package.json
{
  "dependencies": {
    "@repo/rate-limiter": "workspace:*"
  }
}
```

### Configuration

```jsonc
// apps/web/wrangler.jsonc
{
  "ratelimits": [
    {
      "name": "MY_RATE_LIMITER",
      "namespace_id": "1337",
      "simple": {
        "limit": 10,
        "period": 10
      }
    }
  ]
}
```

### Usage

```typescript
import { checkRateLimit } from '@repo/rate-limiter';
import { getRequestEvent } from '$app/server';

const { platform } = getRequestEvent();

const program = Effect.gen(function* () {
  // Returns RateLimitOutcome or fails with typed errors
  yield* checkRateLimit(platform!.env.MY_RATE_LIMITER, 'user_123');

  // Continue with operation
  return { success: true };
}).pipe(
  Effect.catchTags({
    RateLimitExceeded: (error) =>
      Effect.succeed({ error: `Rate limited: ${error.key}` }),
    RateLimitCheckError: (error) =>
      Effect.succeed({ error: `Check failed: ${error.reason}` })
  })
);

return await Effect.runPromise(program);
```

### API

**checkRateLimit(limiter, key)**
- Returns: `Effect.Effect<RateLimitOutcome, RateLimitExceededError | RateLimitCheckError>`
- Throws `RateLimitExceededError` if rate limit is exceeded
- Throws `RateLimitCheckError` if check fails (network, binding unavailable, etc.)

## Cloudflare Architecture

### Service Bindings

The web app connects to the Cloudflare Worker via Service Bindings:

```jsonc
// apps/web/wrangler.jsonc
{
  "services": [
    {
      "binding": "CF_WORKER",
      "service": "cf-sk-effect-template-worker",
      "entrypoint": "CFWorker"
    }
  ]
}
```

**Usage:**
```typescript
import { getRequestEvent } from '$app/server';

const { platform } = getRequestEvent();
const result = await platform!.env.CF_WORKER.sayHelloFromWorker();
```

### Durable Objects

The cf worker defines Durable Objects:

```typescript
// apps/cf/src/index.ts
export class MyDurableObject extends DurableObject<Env> {
  async sayHelloFromDO(): Promise<string> {
    return 'Hello from Durable Object';
  }
}

export class ChatRoom extends DurableObject<Env> {
  private sessions: Map<WebSocket, ChatUser>;
  // WebSocket chat implementation
}
```

**Configuration:**
```jsonc
// apps/cf/wrangler.jsonc
{
  "durable_objects": {
    "bindings": [
      { "class_name": "MyDurableObject", "name": "MY_DURABLE_OBJECT" },
      { "class_name": "ChatRoom", "name": "CHAT_ROOM" }
    ]
  }
}
```

### Worker Entrypoints

```typescript
// apps/cf/src/index.ts
export class CFWorker extends WorkerEntrypoint<Env> {
  async sayHelloFromWorker(): Promise<string> {
    return 'Hello from Worker Entrypoint';
  }

  async sayHelloFromDO(): Promise<string> {
    const id = this.env.MY_DURABLE_OBJECT.idFromName('default');
    const stub = this.env.MY_DURABLE_OBJECT.get(id);
    return await stub.sayHelloFromDO();
  }
}

export default { fetch() { /* ... */ } };
```

## Effect Schema Integration

Effect Schema provides runtime validation, transformations, and type inference fully integrated with the Effect ecosystem.

### Schema Definition

```typescript
// apps/web/src/lib/chat/chat-types.ts
import { Schema } from 'effect';

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

export type Username = Schema.Schema.Type<typeof UsernameSchema>;
```

### Discriminated Union Schemas

```typescript
export const MessageSchema = Schema.Union(
  ChatMessageSchema,
  UserJoinedMessageSchema,
  UserLeftMessageSchema,
  ServerMessageSchema
);

export type Message = Schema.Schema.Type<typeof MessageSchema>;
```

### Native Effect Integration

Effect Schema returns `Effect` directly, eliminating try/catch blocks:

```typescript
// Validation returns Effect natively
validateUsername: (username: string): Effect.Effect<string, MessageError> =>
  Schema.decode(UsernameSchema)(username.trim()).pipe(
    Effect.mapError(
      (error) =>
        new MessageError({
          reason: error.message,
          messageContent: username
        })
    )
  )
```

### Built-in Transformations

```typescript
// Form schema with string-to-number transformation
export const formSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(2), Schema.maxLength(50)),
  age: Schema.NumberFromString.pipe(
    Schema.greaterThanOrEqualTo(0),
    Schema.lessThanOrEqualTo(100)
  )
});
```

## Type Safety

### Platform Types

```typescript
// apps/web/src/app.d.ts
declare global {
  namespace App {
    interface Platform {
      env: Env;         // Cloudflare bindings
      cf: CfProperties; // Request metadata
      ctx: ExecutionContext;
    }
  }
}
```

### Auto-Generated Types

```bash
# Generate Cloudflare Worker types
pnpm cf-typegen

# Generated file: apps/web/src/worker-configuration.d.ts
# Includes types for bindings, Durable Objects, etc.
```

### Accessing Platform in Remote Functions

```typescript
import { getRequestEvent } from '$app/server';

export const myQuery = query(async () => {
  const { platform } = getRequestEvent();

  // Type-safe access to bindings
  const result = await platform!.env.MY_RATE_LIMITER.limit({ key: 'test' });
  const colo = platform!.cf.colo;

  return { result, colo };
});
```

## WebSocket Chat Architecture

The chat implementation demonstrates a complete client-server architecture with Effect.

### Client Side (apps/web)

**Service Layer:**
- `ChatService` - WebSocket connection, message streaming
- `ValidationService` - Username and message validation
- `ChatAppLive` - Combined layer with all dependencies

**Usage Pattern:**
```typescript
import { ChatService, ChatAppLive } from '$lib/chat/chat-layers';

const connectAndJoin = Effect.gen(function* () {
  const chat = yield* ChatService;
  const socket = yield* chat.connect('ws://...');
  yield* chat.joinChat(socket, username);
  return socket;
});

const socket = await Effect.runPromise(
  Effect.provide(connectAndJoin, ChatAppLive)
);
```

### Server Side (apps/cf)

**Durable Object ChatRoom:**
- WebSocket hibernation support
- Message history (last 50 messages)
- User session management
- Broadcast to all connected clients

**Pattern:**
```typescript
export class ChatRoom extends DurableObject<Env> {
  private sessions: Map<WebSocket, ChatUser>;

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocketUpgrade(request);
    }
    // ... REST API endpoints
  }

  webSocketMessage(ws: WebSocket, message: string) {
    const clientMessage: ClientMessage = JSON.parse(message);
    // Handle join_chat, send_message, leave_chat
  }
}
```

## Build Tools

### Rolldown

This project uses Rolldown (Rust-based Vite alternative) for faster builds:

```json
// Root package.json
{
  "pnpm": {
    "overrides": {
      "vite": "npm:rolldown-vite@latest"
    }
  }
}
```

### TailwindCSS v4

```typescript
// apps/web/vite.config.ts
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()]
});
```

### Svelte 5 Features

**Async Compiler:**
```javascript
// apps/web/svelte.config.js
compilerOptions: {
  experimental: {
    async: true
  }
}
```

**Runes:**
```svelte
<script lang="ts">
  let items = $state<Item[]>([]);
  let isLoading = $state(false);

  $effect(() => {
    // Reactive effect
  });
</script>
```

## Development Notes

### Wrangler Type Generation

When updating Cloudflare bindings, regenerate types:

```bash
# From apps/web
pnpm cf-typegen

# This reads both wrangler.jsonc files:
# - apps/web/wrangler.jsonc (web app bindings)
# - apps/cf/wrangler.jsonc (worker bindings)
```

### Effect Version Management

Effect version is managed via pnpm catalog:

```yaml
# pnpm-workspace.yaml
catalog:
  effect: ^3.17.14
```

Use in packages:
```json
{
  "dependencies": {
    "effect": "catalog:"
  }
}
```

### Non-null Assertions

⚠️ Avoid non-null assertions with platform access. While some examples use `platform!`, prefer proper error handling:

```typescript
// Better approach
if (!platform?.env.MY_BINDING) {
  return yield* Effect.fail(
    new PlatformError({ reason: 'Platform not available' })
  );
}

const result = yield* Effect.tryPromise({
  try: () => platform.env.MY_BINDING.operation(),
  catch: (error) => new OperationError({ /* ... */ })
});
```

### Resource Management

**When to use `acquireUseRelease`:**
- Resources acquired, used, and released within a single Effect scope
- Database connections for single queries
- File handles for single operations

**When NOT to use:**
- Resources that outlive the Effect (e.g., WebSockets stored in component state)
- Resources managed by framework lifecycle (Svelte, React)

**Pattern for Long-Lived Resources:**
```typescript
// Effect creates and returns the resource
const socket = yield* chat.connect(url);

// Component manages lifecycle
$effect(() => {
  return () => {
    Effect.runPromise(chat.disconnect(socket));
  };
});
```

## Key Patterns Summary

### Effect Patterns
- **Service Pattern**: `Context.Tag` for dependency injection
- **Layer Pattern**: `Layer.effect` for service implementations
- **Tagged Errors**: `Data.TaggedError` for type-safe error handling
- **Effect.gen**: Composable async operations with `yield*`
- **Streams**: `Stream.async` for event-based data flows

### SvelteKit Patterns
- **Remote Functions**: Type-safe client-server communication
- **Platform Access**: `getRequestEvent().platform` for Cloudflare bindings
- **Experimental Features**: `remoteFunctions`, `async` compiler

### Validation Patterns
- **Effect Schema**: Runtime validation with native Effect integration
- **Built-in Transformations**: `NumberFromString`, `DateFromString`, etc.
- **Discriminated Unions**: Type-safe unions with `Schema.Union`
- **Filters & Annotations**: Custom validation with detailed error messages

### Cloudflare Patterns
- **Service Bindings**: Worker-to-worker communication
- **Durable Objects**: Stateful, strongly consistent objects
- **Rate Limiters**: Per-key rate limiting with Effect wrapper
- **WebSocket Hibernation**: Efficient WebSocket handling in DOs

## References

- [Effect Documentation](https://effect.website/)
- [Effect Schema Documentation](https://effect.website/docs/schema/introduction)
- [SvelteKit Documentation](https://svelte.dev/docs/kit)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [EFFECT_IMPROVEMENTS.md](./EFFECT_IMPROVEMENTS.md) - Detailed architecture notes

---

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.