# Tableloom Frontend

Tableloom Frontend is the customer and admin interface for the Tableloom restaurant platform. It includes the restaurant-facing admin dashboard as well as the guest ordering experience for browsing menus, placing orders, tracking status, and interacting with table services.

## Tech Stack

- React
- Vite
- React Router
- Tailwind CSS
- Socket.IO Client
- Firebase

## Core Features

- Admin dashboard for restaurant operations
- Customer menu browsing and cart flow
- Order tracking and order history
- Kitchen and waiter-related live updates
- Billing, feedback, and restaurant information screens
- Shared service layer for backend integration

## Project Structure

```text
public/         Static assets and service worker files
src/admin/      Admin app pages, components, hooks, and services
src/common/     Shared components, utils, and API services
src/user/       Customer app pages, context, hooks, and UI
src/main.jsx    Frontend entry point
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env` file in the project root and add the frontend environment values required for local development, for example:

```env
VITE_API_BASE_URL=http://localhost:5000
```

Add any Firebase or push-notification related values if those flows are enabled in your setup.

## Available Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Running the App

Development:

```bash
npm run dev
```

Production build:

```bash
npm run build
```

Preview production build locally:

```bash
npm run preview
```

## Application Areas

- Admin: management experience for restaurant staff and operators
- User: dine-in customer experience for menu, cart, orders, and feedback

## Deployment Notes

- Build the app with `npm run build`
- Serve the generated `dist/` folder using your preferred hosting platform
- Make sure the frontend points to the correct backend API URL

## Repository

- GitHub: `https://github.com/Priyanshu-704/Tableloom-Frontend.git`
