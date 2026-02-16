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
│   ├── pos/page.tsx                   # Point of Sale dashboard
│   └── admin/page.tsx                 # Admin dashboard
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
└── LanguageToggle.tsx                  # Language switcher component

utils/
└── helpers.ts                          # Utility functions
```

## Features

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
