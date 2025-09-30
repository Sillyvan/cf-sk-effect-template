# Cloudflare + SvelteKit + Effect.ts Template

A production-ready template for building type-safe, composable applications using **SvelteKit**, **Effect.ts**, and **Cloudflare Workers**.

## Features

- **Type-safe remote functions** with SvelteKit's experimental remote functions API
- **Effect.ts integration** for functional error handling and dependency injection
- **Cloudflare Workers & Durable Objects** for serverless backend
- **Rate limiting** with Effect-based wrapper around Cloudflare Rate Limiters
- **WebSocket chat** demonstrating real-time communication with Durable Objects
- **Runtime validation** using Valibot schemas
- **TailwindCSS v4** with Rolldown for fast builds
- **Turborepo monorepo** with pnpm workspaces

## Tech Stack

- **Frontend**: SvelteKit 5 with Cloudflare Workers
- **Backend**: Cloudflare Workers with Durable Objects
- **Validation**: Valibot for runtime type validation
- **FP Library**: Effect.ts v3 for composable, type-safe error handling
- **Build Tool**: Rolldown (Rust-based Vite alternative)
- **Styling**: TailwindCSS v4
- **Monorepo**: Turborepo with pnpm

## Prerequisites

- **Node.js**: >= 24
- **pnpm**: >= 10.0.0
- **Cloudflare Account**: For deployment (free tier works)

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development servers (web + worker)
pnpm dev

# Build all apps
pnpm build

# Run linting
pnpm lint

# Format code
pnpm format
