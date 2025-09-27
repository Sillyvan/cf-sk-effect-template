# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a Turborepo monorepo that has been modified from the original Next.js template to use SvelteKit with Cloudflare Pages deployment. The original Turborepo structure remains, but the `web` app has been converted to a SvelteKit application.

### Key Components

- **Monorepo Management**: Uses Turborepo for task orchestration across packages
- **Web App**: SvelteKit application (`apps/web`) configured for Cloudflare Pages deployment
- **Package Manager**: pnpm (required, specified in package.json)
- **Node Version**: >= 24 (specified in engines)

### Architecture Notes

- The `web` app uses `@sveltejs/adapter-cloudflare` for Cloudflare Pages deployment
- Wrangler configuration in `apps/web/wrangler.jsonc` defines the Cloudflare Worker setup
- TypeScript types for Cloudflare Workers are auto-generated via `wrangler types`
- TailwindCSS v4 is configured for styling
- The project appears to be a template for Cloudflare + SvelteKit + Effect projects (based on repo name)

## Development Commands

### Global Commands (from repository root)

```bash
# Start development for all apps
pnpm dev

# Build all apps and packages
pnpm build

# Lint all apps and packages
pnpm lint

# Format code across the entire monorepo
pnpm format

# Type check all packages
pnpm check-types
```

### SvelteKit Web App Commands (from apps/web or using filters)

```bash
# Development server
turbo dev --filter=web
# or from apps/web:
pnpm dev

# Build for production
turbo build --filter=web
# or from apps/web:
pnpm build

# Preview build locally with Wrangler
# (from apps/web)
pnpm preview

# Deploy to Cloudflare Pages
# (from apps/web)
pnpm deploy

# Type checking and linting
# (from apps/web)
pnpm check
pnpm check:watch
pnpm lint

# Generate Cloudflare Worker types
# (from apps/web)
pnpm cf-typegen
```

## Important Files

- `turbo.json`: Defines task dependencies and caching behavior
- `apps/web/svelte.config.js`: SvelteKit configuration with Cloudflare adapter
- `apps/web/wrangler.jsonc`: Cloudflare Worker configuration
- `apps/web/src/worker-configuration.d.ts`: Auto-generated Cloudflare types (do not edit manually)
- `apps/web/src/app.d.ts`: SvelteKit type definitions with Cloudflare platform interface

## Development Notes

- When making changes to Cloudflare Worker configuration, regenerate types with `pnpm cf-typegen`
- The project uses Svelte 5 and SvelteKit 2
- TailwindCSS v4 is configured with Vite plugin
- ESLint and Prettier are configured for code quality
- The repository is set up as a template for projects using Effect (functional programming library) with SvelteKit

## Effect Integration Patterns

This project demonstrates excellent patterns for integrating Effect with SvelteKit applications.

### SvelteKit + Effect Integration

#### effectQuery Utility (`apps/web/src/lib/effect-query.ts`)

Bridge Effect with SvelteKit's query system:

```typescript
export const effectQuery = <A, E>(fn: () => Effect.Effect<A, E, never>) => {
	return query(async () => {
		return await Effect.runPromise(fn());
	});
};

export const effectQueryWithLayer = <A, E, R>(
	fn: () => Effect.Effect<A, E, R>,
	layer: Layer.Layer<R>
) => {
	return query(async () => {
		return await Effect.runPromise(Effect.provide(fn(), layer));
	});
};
```

**Usage Pattern:**
- Use `effectQuery` for simple Effect-to-SvelteKit integration
- Use `effectQueryWithLayer` when you need dependency injection with Effect layers
- Effects are automatically converted to Promises for SvelteKit compatibility

### Tagged Error Handling

#### Error Type Definition

Define typed errors using `Data.TaggedError`:

```typescript
class LoadFailureError extends Data.TaggedError('LoadFailure')<{
	attempt: number;
}> {}

class NetworkError extends Data.TaggedError('NetworkError')<{
	attempt: number;
	status: number;
}> {}
```

**Benefits:**
- Type-safe error discrimination with `_tag` field
- Structured error data with custom properties
- Composable with Effect's error handling APIs

#### Multiple Error Handling with catchTags

Use `Effect.catchTags` for elegant multiple error handling:

```typescript
return randomTask.pipe(
	Effect.retry(Schedule.recurs(1)),
	Effect.catchTags({
		LoadFailure: (error) =>
			Effect.succeed({
				attempts: error.attempt,
				status: 'failed' as const,
				message: `Load failed after ${error.attempt} attempts`,
				error: error._tag
			}),
		NetworkError: (error) =>
			Effect.succeed({
				attempts: error.attempt,
				status: 'failed' as const,
				message: `Network error (${error.status}) after ${error.attempt} attempts`,
				error: error._tag
			})
	})
);
```

**Pattern Evolution:**
1. Start with single `Effect.catchTag` for one error type
2. Chain multiple `Effect.catchTag` calls for multiple errors
3. **Best Practice:** Use `Effect.catchTags` with object syntax for multiple errors

### Retry and Error Recovery Patterns

#### Recommended Approach

```typescript
// 1. Define the fallible operation
const randomTask = Effect.gen(function* () {
	attemptCount++;
	const random = Math.random();

	if (random < 0.33) {
		return yield* Effect.fail(new LoadFailureError({ attempt: attemptCount }));
	} else if (random < 0.66) {
		return yield* Effect.fail(new NetworkError({ attempt: attemptCount, status: 500 }));
	} else {
		return { /* success result */ };
	}
});

// 2. Apply retry logic with error recovery
return randomTask.pipe(
	Effect.retry(Schedule.recurs(1)),  // Retry once (2 total attempts)
	Effect.catchTags({ /* handle all error types */ })
);
```

**Pattern Comparison:**
- `retryOrElse`: Good for simple cases, converts failure to success
- `retry + catchTags`: **Preferred** - more composable and type-safe
- `retry + match`: Good for uniform handling of success/failure cases

### Type Safety and Code Organization

#### Shared Types (`apps/web/src/lib/types.ts`)

Define operation result types with error tracking:

```typescript
export type LoadResult = {
	attempts: number;
	status: 'success' | 'failed';
	message: string;
	error?: string;  // Optional field for error type name
};
```

#### Complete Type Flow

```typescript
// 1. Define the operation with proper types
export const loadTest = effectQuery<LoadResult, LoadFailureError | NetworkError>(() => {
	// Effect implementation
});

// 2. Use in SvelteKit components
async function load() {
	loadResult = await loadTest();  // Type: LoadResult
	if (loadResult.status === 'failed') {
		console.log(`Failed with ${loadResult.error}`);  // Type-safe error access
	}
}
```

**Key Patterns:**
- Always specify generic types for `effectQuery<Success, Error>`
- Use union types for multiple error possibilities
- Include error discriminator field in result types
- Leverage TypeScript's type narrowing with status checks

### Best Practices Summary

1. **Error Handling**: Use `Data.TaggedError` + `Effect.catchTags` for multiple error types
2. **Retry Logic**: Prefer `Effect.retry` + error handling over `retryOrElse`
3. **Type Safety**: Always specify generic types and use union types for errors
4. **Code Organization**: Share types in `$lib/types.ts`, utilities in `$lib/`
5. **SvelteKit Integration**: Use `effectQuery` utilities for seamless integration