# RMS-2.0

Restaurant Management System built with Next.js 14 App Router.

## Tech Stack

- **Next.js 16** (App Router) - Latest stable version
- **React 19** - Latest stable version
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (Auth + Postgres + Realtime)
- **ESLint** configured

## Project Structure

```
app/
├── (public)/
│   └── table/[tableNumber]/page.tsx  # Public table ordering page
├── (dashboard)/
│   ├── pos/page.tsx                   # Point of Sale dashboard (auth required)
│   └── admin/page.tsx                 # Admin dashboard (owner only)
├── login/page.tsx                     # Staff login page
├── layout.tsx                          # Root layout with i18n
├── page.tsx                            # Homepage (redirects to /pos)
└── globals.css                         # Global styles

lib/
├── supabaseClient.ts                   # Supabase client setup
├── i18n.ts                             # Translation utilities
└── LanguageContext.tsx                 # Language context provider

types/
└── index.ts                            # TypeScript type definitions

components/
├── LanguageToggle.tsx                  # Language switcher component
├── OrderManagement.tsx                 # POS order management component
└── EndOfDayReport.tsx                  # End of day reporting component

utils/
├── helpers.ts                          # Utility functions
└── useAuthGuard.ts                     # Authentication guard hook
```

## Features

### ✅ Authentication System
- Staff login page with email/password authentication
- Role-based access control (Owner and Cashier roles)
- Auth guards protecting POS and Admin routes
- Profile validation with active/deleted checks
- Automatic redirect to login for unauthenticated users
- Logout functionality on protected pages

### ✅ Multi-language Support (Arabic/English)
- UI translations for Arabic and English
- Language toggle in global header
- RTL support when Arabic is selected
- **Menu content remains in English** (does not auto-translate)

### ✅ Route Groups
- **(public)**: Public-facing pages like table ordering
- **(dashboard)**: Protected dashboard pages (POS, Admin)

### ✅ Supabase Integration
- Client configured and ready to use
- Environment variables for URL and Anon Key

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production

```bash
npm run build
npm start
```

## Available Routes

- `/` - Homepage (redirects to `/pos`)
- `/login` - Staff login page (email/password authentication)
- `/pos` - Point of Sale dashboard (requires authentication, cashier or owner role)
- `/admin` - Admin dashboard (requires authentication, owner role only)
- `/table/[tableNumber]` - Table ordering page (public, no authentication required)

## Authentication

### User Roles
- **Owner**: Full access to both POS and Admin dashboards
- **Cashier**: Access to POS dashboard only
- **Public/Anonymous**: Access to table ordering pages only

### Setting Up Authentication

1. **Create a Supabase Auth User**:
   - Go to your Supabase dashboard → Authentication → Users
   - Click "Add user" and create a user with email/password

2. **Create a Profile Record**:
   - Go to Table Editor → profiles table
   - Add a new row with:
     - `id`: Same as the user's UUID from Authentication
     - `role`: Either `'owner'` or `'cashier'`
     - `full_name`: User's display name
     - `email`: User's email
     - `is_active`: `true`
     - `deleted_at`: `null`

3. **Login**:
   - Navigate to `/login`
   - Enter the email and password you created
   - You'll be redirected to `/pos` upon successful login

### Protected Routes
- `/pos` and `/admin` are protected by authentication guards
- Unauthenticated users are automatically redirected to `/login`
- Users without proper roles see an access denied message

## Database Setup

### Required Tables
The application expects the following tables in Supabase:
- `profiles` - User profiles with role information
- `tables` - Restaurant tables
- `business_days` - Daily business operations tracking
- `sessions` - Customer sessions (dine-in, takeaway, delivery)
- `orders` - Customer orders
- `order_items` - Order line items
- `menu_categories` - Menu categories
- `menu_items` - Menu items
- `bills` - Bills/invoices
- `payments` - Payment records

### Row Level Security (RLS)
- Anonymous users can SELECT from menu tables (menu_categories, menu_items, modifiers)
- Anonymous users can INSERT pending orders
- Staff operations require authentication
- The `business_days.opened_by` field requires a valid authenticated user ID

## Available Routes

- `/` - Homepage (redirects to `/pos`)
- `/pos` - Point of Sale dashboard
- `/admin` - Admin dashboard
- `/table/[tableNumber]` - Table ordering page (e.g., `/table/1`, `/table/5`)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Yes |

## Development

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Notes

- Language preference is stored in localStorage
- RTL layout automatically applied for Arabic
- Menu items and product data should remain in English
- UI text (buttons, labels, navigation) is translated based on selected language
