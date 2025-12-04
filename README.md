# NeoDash

A high-fidelity, mobile-first personal analytics dashboard built with Next.js, TailwindCSS, Shadcn UI, Recharts, Zustand, and Framer Motion.

## Features

- 🎨 **Beautiful Design**: Glassmorphism cards, soft gradients, and elegant shadows
- 📱 **Mobile-First**: Responsive layout with bottom navigation for mobile devices
- 🖥️ **Desktop Optimized**: Sidebar navigation and grid layout for larger screens
- 📊 **Real-time Analytics**: Animated charts with Recharts
- 🌓 **Theme Toggle**: Light and dark mode support
- ⚡ **Fast Performance**: Built with Next.js 14 and optimized for speed
- 🎭 **Smooth Animations**: Micro-interactions powered by Framer Motion
- 🔐 **User Authentication**: Secure login and signup with NextAuth.js
- 👤 **User Profiles**: Personalized data for each user
- 💾 **Data Persistence**: User-specific data storage
- 🧭 **Guided Onboarding**: Step-by-step setup flow for connecting data sources

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: TailwindCSS
- **UI Components**: Shadcn UI
- **Charts**: Recharts
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Authentication**: NextAuth.js
- **Password Hashing**: bcryptjs

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Set up Supabase:

   - Create a free account at [supabase.com](https://supabase.com)
   - Create a new project
   - Go to Project Settings → API
   - Copy your Project URL and anon/public key

3. Set up environment variables:

Create a `.env.local` file in the root directory:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Optional: Google Maps API key for location autocomplete
# Get one at: https://console.cloud.google.com/google/maps-apis
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

Generate a secret key:
```bash
openssl rand -base64 32
```

4. Set up the database:

   - In your Supabase project, go to SQL Editor
   - Run the migration file: `supabase/migrations/001_initial_schema.sql`
   - This will create all necessary tables (users, user_data, user_config, focus_sessions)

**Note:** The Google Maps API key is optional. If not provided, location input will use browser geolocation and a basic text input. For full autocomplete functionality, get a free API key from [Google Cloud Console](https://console.cloud.google.com/google/maps-apis).

3. Run the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

7. Create an account:
   - Click "Get Started" or navigate to `/signup`
   - Fill in your name, email, and password
   - Complete the onboarding wizard at `/onboarding` to connect your portfolio, weather location, and productivity stats
   - Once finished, you'll be redirected to your personalized dashboard

## Project Structure

```
neodash/
├── app/
│   ├── api/
│   │   ├── auth/           # NextAuth.js authentication routes
│   │   ├── crypto/         # Crypto portfolio API (user-specific)
│   │   ├── productivity/  # Productivity stats API (user-specific)
│   │   ├── user/          # User profile API
│   │   └── weather/       # Weather API (user-specific)
│   ├── dashboard/         # Dashboard page (protected)
│   ├── analytics/         # Analytics page (protected)
│   ├── onboarding/       # Post-login onboarding wizard
│   ├── settings/         # Settings page (protected)
│   ├── login/            # Login page
│   ├── signup/           # Signup page
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Landing page
│   └── globals.css       # Global styles
├── components/
│   ├── ui/               # Shadcn UI components
│   ├── stat-card.tsx     # Stat card component
│   ├── chart-card.tsx    # Chart wrapper component
│   ├── metric-row.tsx    # Metric row component
│   ├── mobile-nav.tsx    # Mobile navigation
│   ├── sidebar.tsx       # Desktop sidebar
│   ├── theme-provider.tsx # Theme provider
│   └── auth-provider.tsx # Auth provider
├── lib/
│   ├── db.ts             # Database functions (JSON-based)
│   ├── auth.ts           # Auth utilities
│   ├── utils.ts          # Utility functions
│   └── actions.ts        # Server actions
├── stores/
│   └── dashboard-store.ts # Zustand store
├── types/
│   └── next-auth.d.ts    # NextAuth type definitions
└── data/                 # User data storage (created automatically)
```

## Authentication

The app uses NextAuth.js for authentication with credentials provider. User data is stored in JSON files in the `data/` directory (which is gitignored).

### Protected Routes

The following routes require authentication:
- `/dashboard`
- `/analytics`
- `/settings`

Unauthenticated users are redirected to `/login`.

## User Data

Each user has their own data stored in the `data/user-data.json` file:
- Crypto portfolio holdings and history (populated after onboarding)
- Productivity statistics and tasks (using user-provided numbers)
- Weather preferences and location (fetched from wttr.in after onboarding)

If a section has no real data yet, the dashboard shows an empty state with a CTA to complete setup—placeholder metrics are never displayed.

## Data APIs

All endpoints require authentication and return user-specific payloads. When a user has not finished onboarding, the API responds with `{ needsSetup: true }` so the UI can prompt for details instead of rendering placeholders.

- **Weather Data**: `/api/weather`
- **Crypto Portfolio**: `/api/crypto`
- **Productivity Stats**: `/api/productivity`
- **User Profile**: `/api/user`
- **Onboarding Status**: `/api/user/setup`

## Components

### Reusable Components

- `<StatCard>`: Display statistics with icons and trends
- `<ChartCard>`: Wrapper for charts with titles and descriptions
- `<MetricRow>`: Row component for displaying metrics
- `<MobileNav>`: Bottom navigation for mobile devices
- `<Sidebar>`: Sidebar navigation for desktop with user info

## Design System

The project uses a consistent design system with:

- Custom color palette with CSS variables
- Glassmorphism effects via utility classes
- Smooth animations and transitions
- Responsive breakpoints
- Consistent spacing and typography

## Development

### Adding New User Data

To add new data types for users, update:
1. `lib/db.ts` - Extend the `UserData` and `UserConfig` interfaces and persistence helpers
2. Create corresponding API routes in `app/api/`
3. Update onboarding (`app/onboarding/page.tsx`) so users can provide the required inputs
4. Update dashboard/analytics pages to fetch and display the new data

### Database

Currently using JSON file-based storage. To migrate to a real database:
1. Replace functions in `lib/db.ts` with database queries
2. Update the `UserData` interface as needed
3. Run migrations if using a SQL database

## License

MIT
