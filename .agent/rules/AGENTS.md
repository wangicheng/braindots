---
trigger: always_on
---

# Project Overview

OpenDots is a physics-based puzzle game inspired by "Open Dots", built using TypeScript, Vite, Pixi.js for rendering, and Rapier2d for physics simulation. Players solve levels by drawing lines and shapes to guide balls to their destinations or interact with various game objects. The project includes a fully functional level editor and a level selection interface.

## Repository Structure

- `.agent/` - Agent workflows and configurations.
- `backend/` - Cloudflare Workers backend (Hono + D1).
  - `src/` - Backend source code.
  - `wrangler.toml` - Cloudflare configuration.
- `src/` - Source code.
  - `game/` - Core game logic and subsystems.
    - `data/` - Data handling.
    - `editor/` - Editor utilities (e.g., `TransformGizmo`).
    - `effects/` - Visual effects managers.
    - `input/` - Input handling logic.
    - `levels/` - Level data schemas (`LevelSchema.ts`) and JSON files.
    - `objects/` - Game entities (Ball, Obstacle, etc.) inheriting or implementing common interfaces.
    - `physics/` - Physics engine integration (`PhysicsWorld`).
    - `services/` - Data service layer (`LevelService`, `RestApiClient`).
    - `ui/` - User interface components (`LevelSelectionUI`, `EditorUI`).
  - `main.ts` - Application entry point.
- `public/` - Static assets.
- `dist/` - Production build artifacts.

## Build & Development Commands

```bash
# Install dependencies
npm install

# Start development server (Frontend)
# Connects to remote backend by default (see .env)
npm run dev

# Backend Development (in backend/ directory)
cd backend
npm install
npm run dev # Starts local worker
```

## Code Style & Conventions

- **Language**: TypeScript (Strict mode enabled).
- **Formatting**: Adhere to standard TypeScript conventions (PascalCase for classes, camelCase for methods/variables).
- **Linting**: No explicit linter script, but code should be clean and strictly typed.
- **Imports**: Use explicit imports.
- **Components**: Game objects are typically classes encapsulating both Pixi visuals and Rapier physics bodies.

## UI & Visual Guidelines

> **Note**: Detailed UI specifications found in [.agent/rules/UI_DESIGN.md](.agent/rules/UI_DESIGN.md).

- **Colors**:
  - **Game Objects**: Balls (Blue/Pink), Static (Grey), Dynamic (Light Grey).
  - **Special**: Ice (Cyan), Conveyor (Dark Grey), Selection (Material Blue).
- **Typography**: `Arial` (Canvas), `Inter` (DOM).
- **Core Layout**: 16:9 Canvas centered on `#242424` background.

## Architecture Notes

- **Core Loop**: `Game.ts` manages the main game loop, orchestrating `PhysicsWorld` (Rapier) steps and `Pixi.Application` rendering updates.
- **Physics**: Rapier2d is used for collision detection and rigid body dynamics. `PhysicsWorld` wrapper likely used.
- **Rendering**: Pixi.js handles the 2D scenegraph. Visuals are often synchronized with physics bodies in the `update` loop.
- **Level System**: Levels are defined in JSON (matching `LevelSchema.ts`). `LevelManager` handles loading/parsing.
- **Editor**: `EditorUI.ts` (in `ui/`) and `TransformGizmo.ts` (in `editor/`) allow users to create and modify levels at runtime.
- **Services**: `LevelService` manages state and data persistence. It uses `RestApiClient` to communicate with the backend.
  - `RestApiClient`: Handles HTTP requests to the Cloudflare Worker.
  - Authentication: Uses `x-user-id` header (currently stored in localStorage) for identification.
- **Backend**: Hosted on Cloudflare Workers.
  - **Framework**: Hono.
  - **Database**: Cloudflare D1 (SQLite) for storing users, levels, and stats.
  - **Tables**: `users`, `levels` (stores JSON data), `likes`.

## Testing Strategy

- **Manual Testing**: Primary method. Run `npm run dev` and test gameplay mechanics, level editor interactions, and level transitions.
- **Component Testing**: Isolate individual game objects (e.g., `Ball`, `Laser`) in specific test levels (like `level1.json` or a debug level) to verify physics and logic.

## Security & Compliance

- **Dependencies**: Keep dependencies updated. Review `package.json` for security advisories.
- **Secrets**: No secrets should be committed. API keys (if added) should be in `.env`.

## Agent Guardrails

- **Build Integrity**: Ensure `npm run build` passes before completing tasks involving code changes.
- **Type Safety**: Do not suppress TypeScript errors with `@ts-ignore` unless absolutely necessary and well-justified.
- **File Boundaries**: Avoid modifying `.gitignore` or `package-lock.json` unnecessarily.