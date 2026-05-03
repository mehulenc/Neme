# Neme Frontend

The Neme frontend is a React application built with Vite and styled with Tailwind CSS v4. It provides a side-by-side reconciliation dashboard for financial data.

## Tech Stack

- **React 19**: Using the latest React features.
- **TypeScript**: For type-safe development.
- **Vite**: Ultra-fast build tool and dev server.
- **Tailwind CSS v4**: Leveraging modern CSS variables and a semantic design system.

## Design System

We use a semantic design system defined in `src/index.css`. Use the following tokens instead of hardcoded colors:

- `bg-background`: Main application background.
- `text-foreground`: Main text color.
- `bg-card`: Background for transaction/expense cards.
- `bg-primary`: The primary Teal accent.
- `text-primary`: Text on primary backgrounds.

## Setup

1. Install dependencies: `npm install`
2. Start the dev server: `npm run dev`
3. Open `http://localhost:5173`

## Directory Structure

- `src/components/`: Reusable UI components.
- `src/hooks/`: Custom React hooks for data fetching and state.
- `src/types/`: TypeScript interface definitions.
- `src/index.css`: Global styles and Tailwind configuration.
