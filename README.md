# AI Garment Management System

A complete, front-end-only admin dashboard for managing a garment production business — orders, workers, production tracking, payments, and AI-driven analytics. Built with plain HTML5, CSS3, and vanilla JavaScript. All data is persisted in the browser's LocalStorage, so it works entirely offline with no backend or build step.

## Getting started

1. Open `login.html` in a browser (or serve the folder with any static server, e.g. `npx serve .`).
2. Sign in with the seeded demo account:
   - **Email:** `admin@agms.com`
   - **Password:** `admin123`
3. Or use **Create Account** to register your own manager login.

On first run, the app seeds sample orders, workers, production logs, and payment records into LocalStorage so every screen has data to show immediately. Clearing your browser's site data will reset everything back to a fresh seed.

## Project structure

```
AI-Garment-System/
├── login.html          Sign in / create account (glassmorphism UI)
├── dashboard.html       Overview: stat cards, recent orders, AI alerts
├── orders.html          Orders CRUD, search, status filter
├── workers.html         Workforce CRUD, search
├── production.html      Daily production log, target vs completed
├── payments.html        Worker salary payments, status tracking
├── analytics.html       Chart.js-powered revenue/production/worker/order analytics
│
├── css/
│   ├── layout.css        Shared design tokens + sidebar/topbar/table/modal components
│   ├── login.css
│   ├── dashboard.css
│   ├── orders.css
│   ├── workers.css
│   ├── production.css
│   ├── payments.css
│   └── analytics.css
│
├── js/
│   ├── utils.js          Shared LocalStorage data layer (AGMS namespace), auth, toasts
│   ├── login.js
│   ├── dashboard.js
│   ├── orders.js
│   ├── workers.js
│   ├── production.js
│   ├── payments.js
│   └── analytics.js
│
└── assets/
    ├── images/
    └── icons/
```

`css/layout.css` and `js/utils.js` are shared foundations loaded on every internal page (not listed in the original brief, added so the sidebar, theming, and data layer stay consistent instead of being copy-pasted six times).

## Data model (LocalStorage keys)

| Key | Description |
|---|---|
| `agms_users` | Registered accounts (`name`, `email`, `password`, `role`) |
| `agms_session` | Currently signed-in user |
| `agms_orders` | Orders (`id`, `product`, `quantity`, `status`, `deliveryDate`, `createdAt`) |
| `agms_workers` | Workers (`id`, `name`, `department`, `salary`, `phone`, `joined`) |
| `agms_production` | Daily production logs (`id`, `date`, `department`, `target`, `completed`) |
| `agms_payments` | Salary payments (`id`, `workerId`, `workerName`, `amount`, `status`, `date`) |
| `agms_theme` | `light` / `dark` |
| `agms_sidebar_collapsed` | Sidebar collapsed state |

## Features

- Glassmorphism login/register with client-side validation and shake-on-error feedback.
- Collapsible sidebar with active-link highlighting, persisted across sessions.
- Dark mode toggle (persisted, applies site-wide via `data-theme` attribute).
- Full CRUD (Add/View/Edit/Delete) for Orders, Workers, Production entries, and Payments — all backed by LocalStorage.
- Live search and status filtering on Orders, Workers, and Payments tables.
- Auto-generated IDs (`ORD-…`, `WRK-…`, `PRD-…`, `PAY-…`).
- Heuristic "AI" alerts on the dashboard (overdue orders, upcoming deadlines, production shortfalls, pending payments) and an AI summary + four animated Chart.js charts on the Analytics page.
- Fully responsive layout, down to mobile, with an off-canvas sidebar on small screens.
- Route guarding: every internal page redirects to `login.html` if there's no active session; Logout is available from every sidebar.

## Tech stack

- HTML5 / CSS3 / Vanilla JavaScript (ES6+)
- Font Awesome 6 (icons, via CDN)
- Google Fonts — Poppins
- Chart.js 4 (via CDN, Analytics page only)
