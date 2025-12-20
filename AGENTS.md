# AGENTS.md - Project Guidelines for Real Active Cure Capacitor

## Commands
- **Build**: `npm run build` (runs TypeScript check + Vite build)  
- **Lint**: `npm run lint` (ESLint with TypeScript, React hooks, and refresh rules)
- **Dev**: `npm run dev` (Vite dev server on port 3000 with host)
- **Type Check**: `tsc -b` (TypeScript compiler check)

## Code Style Guidelines
- **Imports**: Use absolute paths with `@/` alias (e.g., `@/components/ui/button`)
- **UI Components**: Use Radix UI + Tailwind patterns from `@/components/ui/`
- **Styling**: Tailwind CSS with `cn()` utility from `@/lib/utils` for class merging
- **State**: Zustand for global state management (import from `@/lib/store`)
- **Routing**: React Router v7 with createBrowserRouter
- **Authentication**: Supabase auth from `@/utils/supabase`
- **Icons**: Lucide React for icon components
- **Naming**: PascalCase for components, camelCase for variables/functions
- **Error Handling**: Use alert() for simple error messages, async/await for promises
- **Language Support**: Multi-language with text from `@/lib/text`, lang state in store