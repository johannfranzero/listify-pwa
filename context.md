# LISTIFY PWA - Project Overview & Context

LISTIFY is a modern, offline-first Progressive Web App (PWA) built with React, Vite, and TypeScript. It offers extensive lists, planning, insights, and AI-assistant capabilities in a user-friendly, responsive format.

## 1. Technology Stack & Architecture
- **Frontend Framework**: React 18, Vite
- **Routing**: React Router DOM v6
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand (modular slices for auth, list, planner, settings, etc.)
- **Authentication**: Clerk (Primary) with a local storage Zustand fallback for offline/dev.
- **Backend/Database**: Supabase
- **PWA Capabilities**: `vite-plugin-pwa` for service workers, offline support, and installation capabilities.
- **Charts/Visualization**: Chart.js (`react-chartjs-2`)
- **Error Tracking**: Sentry

## 2. All Screens (Implemented)
The application consists of the following primary routes and screens located in `src/pages`:

| Page / Route | Component | Description |
|---|---|---|
| **Dashboard** (`/dashboard`) | `DashboardPage.tsx` | Main landing view showing a summary of daily tasks, pinned lists, and quick actions. |
| **Lists** (`/lists`) | `ListsPage.tsx` | The core interface for creating, managing, and viewing various lists. |
| **Planner** (`/planner`) | `PlannerPage.tsx` | Calendar and scheduling view for time-based tasks and events. |
| **Insights** (`/insights`) | `InsightsPage.tsx` | Data visualization dashboard using Chart.js to show productivity, spending, or list statistics. |
| **Assistant** (`/assistant`) | `AssistantPage.tsx` | AI-powered conversational interface to help users manage tasks and get recommendations. |
| **Settings** (`/settings`) | `SettingsPage.tsx` | User preferences, accessibility toggles, budget configuration, and account management. |
| **Feedback** (`/feedback`) | `FeedbackPage.tsx` | Form for users to submit bug reports or feature requests. |
| **Onboarding** (`/onboarding`) | `OnboardingPage.tsx` | Initial setup flow for new users to configure their profile and app preferences. |
| **Login** (`/login`) | `LoginPage.tsx` | Authentication entry point. |
| **Signup** (`/signup`) | `SignupPage.tsx` | Account registration. |
| **Offline** (`/offline`) | `OfflinePage.tsx` | Fallback screen displayed when the user is completely offline without cached data. |

## 3. Existing Features & Capabilities (What We Have)
- **Offline-First Storage**: Utilizes IndexedDB (`idb-keyval`) mapped to Zustand for robust offline persisting.
- **Auth Bridging**: A complex auth wrapper (`ClerkAuthBridge`) that synchronizes Clerk JWTs with Supabase and Zustand.
- **Responsive Navigation**: A standard mobile-first `BottomNav` paired with a flexible `SideDrawer`.
- **Accessibility Options**: Dynamic DOM classes for high contrast and larger text triggered from settings.
- **PWA Prompts**: Built-in UI for installation (`InstallPrompt.tsx`) and app updates (`UpdatePrompt.tsx`).
- **Global Budgeting**: Weekly budget limits synchronized down to the `list.ts` state.

## 4. Missing / Pending Features (What is Missing)
Based on standard PWA and advanced list-making applications, the following features are not yet fully implemented or are missing:
- **Real-Time Collaboration**: True multi-player editing (like Google Docs) on shared lists using Supabase Realtime/CRDTs.
- **Push Notifications**: Web Push API integration to notify users of upcoming Planner events or shared list updates.
- **Device Native Integration**: Syncing with iOS Reminders, Google Calendar, or native contact sharing.
- **Advanced Export/Import**: Ability to export lists to PDF, CSV, or Markdown, and import from other apps (Todoist, Notion).
- **Offline Conflict Resolution**: Handling simultaneous offline edits across different devices when they come back online (currently relies on basic last-write-wins).
- **Home Screen Widgets**: Leveraging the new PWA widgets API or File Handling API for desktop integrations.
- **Two-Factor Authentication (2FA) UI**: Direct integration of Clerk's 2FA management within the Settings screen.
- **Drag-and-Drop Ordering**: Fully fluid drag-and-drop mechanics for lists and planner items across touch and desktop.
