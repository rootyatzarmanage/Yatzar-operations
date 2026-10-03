# Yatzar Operations Frontend

This is the frontend application for the Yatzar Operations dashboard. It provides a modern operations management interface for viewing analytics, managing teams, workspaces, permissions, and contact information in a single admin portal.

The app is built with React, TypeScript, Vite, and Tailwind CSS, and uses a route-based administration layout for an operations-focused user experience.

## Overview

The frontend currently includes:

- Analytics dashboard landing page
- Team management screen
- Workspace management with add, edit, search, pagination, and delete actions
- Contacts overview page
- App permission controls
- Shared admin shell with header, sidebar, theme handling, and responsive layout
- 404 fallback page

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- React Router
- react-i18next for multilingual support
- dark mode and theme context support
- reusable UI components and layout primitives

## Project Structure

```text
Frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── common/
│   │   ├── header/
│   │   └── ui/
│   ├── context/
│   ├── hooks/
│   ├── i18n/
│   ├── layout/
│   ├── locales/
│   ├── pages/
│   │   ├── Dashboard/
│   │   ├── OtherPage/
│   │   ├── Analytics.tsx
│   │   ├── AppPermission.tsx
│   │   ├── Contacts.tsx
│   │   ├── Teams.tsx
│   │   ├── Workspace.tsx
│   │   └── Others.tsx
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── package.json
├── vite.config.ts
├── tsconfig.json
├── eslint.config.js
├── index.html
├── AGENTS.md
├── LICENSE.md
└── README.md
```

## Application Routes

The current frontend routes are registered in `src/App.tsx`:

- `/` — Analytics dashboard
- `/teams` — Teams page
- `/others` — Additional operational widgets or utility pages
- `/app-permission` — Application permission management
- `/workspace` — Workspace records management
- `/contacts` — Contact directory
- `*` — Not found page

## Features in Detail

### Analytics
The main dashboard area is designed for operational insight and reporting, serving as the entry point for the Yatzar admin app.

### Workspace Management
The workspace page includes:

- searchable workspace list
- add new workspace form
- edit existing workspace details
- status toggle between Enabled and Disabled
- bulk selection and delete actions
- pagination controls

### Permission Management
The app permission screen organizes permission toggles for different features or modules and is designed to support access control configuration.

### Contacts and Teams
These sections provide the front-end foundation for organizational data such as users, teams, and internal relationships.

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm

### Install dependencies

```bash
npm install
```

### Run the app in development mode

```bash
npm run dev
```

The app will usually be served by Vite on the local development port, typically:

```text
http://localhost:5173
```

### Build for production

```bash
npm run build
```

### Lint the project

```bash
npm run lint
```

## Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  }
}
```

## Notes

This project is the frontend layer of the Yatzar Operations system and is currently focused on dashboard UI, administration screens, and management workflows. It is structured to support further integration with backend APIs and operational business logic as the application grows.

## License

This project includes the original TailAdmin template license file as part of the frontend setup. The app itself is intended for the Yatzar Operations project and may be adapted further as needed.
