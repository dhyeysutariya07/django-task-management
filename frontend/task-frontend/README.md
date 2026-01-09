# Task Management Dashboard - React Frontend

A modern, feature-rich React dashboard for the Django task management backend with role-based access control, real-time updates, and advanced analytics.

## Features

### 🔐 Authentication System
- **JWT Authentication** with automatic token refresh (last 2 minutes of validity)
- **Email Verification** flow
- **CAPTCHA Challenge** handling for security
- **Session Management** (max 3 concurrent sessions)
- **Role-Based Access** (Manager, Developer, Auditor)

### 📋 Task Management
- **Drag-and-Drop** task board with status columns
- **Optimistic Updates** with automatic rollback on error
- **Real-Time Priority Badges** that update based on deadline proximity
- **Parent-Child Task** relationships
- **Bulk Operations** with validation
- **Task History** tracking

### 📊 Analytics Dashboard
- **Efficiency Score** calculation and visualization
- **Task Statistics** by status and priority
- **Team Performance** metrics
- **Auto-Refresh** every 5 minutes

### 🎨 Modern UI/UX
- **Dark Mode** with vibrant color palette
- **Glassmorphism** effects
- **Smooth Animations** and micro-interactions
- **Responsive Design** for all screen sizes
- **Loading States** and skeletons

### 🔒 Advanced Features
- **Temporal Access Control** (9 AM - 6 PM restrictions for developers)
- **Timezone Support** for global teams
- **Rate Limiting** awareness with user feedback
- **Error Boundaries** for graceful error handling

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **React Router v6** for routing
- **TanStack Query** (React Query) for server state management
- **Axios** for HTTP requests
- **Hello Pangea DnD** for drag-and-drop
- **Recharts** for analytics visualization
- **React Flow** for dependency graphs
- **Zustand** for client state
- **React Hot Toast** for notifications
- **date-fns** for date manipulation

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Django backend running on `http://localhost:8000`

### Installation

**Note:** If you encounter PowerShell execution policy errors, you have two options:

1. **Run PowerShell as Administrator** and execute:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. **Use Command Prompt (cmd)** instead of PowerShell to run npm commands

Then install dependencies:

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_TOKEN_REFRESH_THRESHOLD=120000
```

### Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Build

Create a production build:

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── auth/           # Authentication components
│   ├── tasks/          # Task management components (to be implemented)
│   ├── analytics/      # Analytics components (to be implemented)
│   ├── common/         # Reusable components
│   └── layout/         # Layout components (to be implemented)
├── contexts/           # React contexts
├── hooks/              # Custom React hooks
├── services/           # API service layer
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── styles/             # CSS stylesheets
├── App.tsx             # Main app component
└── main.tsx            # Entry point
```

## Backend Integration

### Expected API Endpoints

The frontend expects the following backend endpoints:

#### Authentication
- `POST /api/auth/login/` - Login
- `POST /api/auth/register/` - Register
- `POST /api/auth/verify-email/` - Verify email
- `POST /api/auth/resend-verification/` - Resend verification
- `POST /api/auth/refresh/` - Refresh token
- `POST /api/auth/logout/` - Logout
- `GET /api/auth/me/` - Get current user

#### Tasks
- `GET /api/tasks/` - List tasks (with filters)
- `POST /api/tasks/` - Create task
- `GET /api/tasks/:id/` - Get task details
- `PATCH /api/tasks/:id/` - Update task
- `DELETE /api/tasks/:id/` - Delete task
- `POST /api/tasks/bulk-update/` - Bulk update tasks
- `GET /api/tasks/:id/history/` - Get task history

#### Analytics
- `GET /api/tasks/analytics/` - Get analytics data

### Expected Response Headers

- `X-New-Token` - Auto-refresh token (issued in last 2 minutes of validity)
- `X-New-Refresh-Token` - New refresh token
- `X-Write-Available-In` - Seconds until write operations available (rate limiting)
- `X-Captcha-Question` - Math CAPTCHA question (after failed login attempts)

## Features Implementation Status

### ✅ Completed
- Project setup and configuration
- TypeScript type definitions
- Utility functions (token manager, date utils, validators)
- API services layer with Axios interceptors
- Authentication context and hooks
- Task hooks with React Query
- Analytics hooks
- Temporal access control hook
- Design system and styling
- Common components (Modal, Loading, Error Boundary, etc.)
- Authentication forms (Login, Register, Email Verification)
- Protected routes
- Main app structure with routing

### 🚧 To Be Implemented
- Task Board with drag-and-drop
- Task Card component
- Task Form (create/edit)
- Task Details Modal
- Bulk Update Modal
- Dependency Graph visualization
- Analytics Dashboard
- Efficiency Score component
- Task Charts
- Layout components (Navbar, Sidebar)
- Additional task management features

## Development Notes

### Auto-Refresh Token Logic

The frontend automatically refreshes JWT tokens when they're about to expire (within last 2 minutes). This is handled by:

1. **Token Manager** - Checks token expiry
2. **Axios Interceptor** - Detects `X-New-Token` header in responses
3. **Automatic Storage** - Saves new tokens without user intervention

### Optimistic Updates

Task updates use optimistic UI updates for instant feedback:

1. UI updates immediately
2. API request sent in background
3. On success: Cache invalidated and refetched
4. On error: UI rolled back to previous state

### Temporal Access Control

Developers can only update tasks between 9 AM - 6 PM in their timezone, except for critical priority tasks. The `useTemporalAccess` hook handles this logic.

### Role-Based Features

- **Managers**: Can assign tasks to anyone, no time restrictions
- **Developers**: Can only assign tasks to themselves, 9-6 PM restrictions
- **Auditors**: Read-only access, unlimited read requests (no rate limiting)

## Contributing

When adding new features:

1. Add TypeScript types to `src/types/index.ts`
2. Create API service methods in `src/services/`
3. Create custom hooks in `src/hooks/`
4. Build UI components in `src/components/`
5. Add routes in `src/App.tsx`

## License

MIT

## Support

For issues or questions, please contact the development team.
