# React App Shell - Structure & Routing

## 📋 Components Created

### 1. **ProtectedRoute.js** - Authentication Wrapper
- Checks for JWT token in localStorage
- Redirects to `/auth` if not authenticated
- Shows loading state while checking
- Wraps all authenticated pages

### 2. **Sidebar.js** - Navigation Menu
- Dark sidebar (240px fixed width)
- Navigation items:
  - Dashboard
  - Tasks
  - Goals
  - Habits
  - Progress
  - Insights
- Active state highlighting
- Logout button

### 3. **Topbar.js** - Header
- Displays current page title
- Shows user profile (avatar, name, email)
- Fixed height (80px)
- Positioned above main content

### 4. **EmptyState.js** - Generic Placeholder
- Reusable empty state component
- Customizable icon, title, description
- Used for pages without content yet

### 5. **AppShell.js** - Main Layout Wrapper
- Combines Sidebar + Topbar + ProtectedRoute
- Flex layout: sidebar (fixed) + main content (flex)
- Wraps all authenticated page content
- Consistent styling across app

---

## 🗂️ Pages Created/Updated

| Page | Path | Purpose | Status |
|------|------|---------|--------|
| Home | `/` | Redirects to `/dashboard` or `/auth` | ✓ Created |
| Auth | `/auth` | Signup/Signin | ✓ Updated |
| Dashboard | `/dashboard` | Main dashboard view | ✓ Rebuilt |
| Tasks | `/tasks` | Task management | ✓ Created (empty) |
| Goals | `/goals` | Goal tracking | ✓ Created (empty) |
| Habits | `/habits` | Habit management | ✓ Created (empty) |
| Progress | `/progress` | Analytics view | ✓ Created (empty) |
| Insights | `/insights` | AI insights | ✓ Created (empty) |
| Onboarding | `/onboarding` | User setup flow | ✓ Existing |

---

## 🏗️ Layout Structure

```
┌─────────────────────────────────────────────┐
│                                             │
│  SIDEBAR (240px fixed)   │   TOPBAR        │
│  - Dashboard             │   - Page Title  │
│  - Tasks                 │   - User Info   │
│  - Goals                 │                 │
│  - Habits                ├─────────────────┤
│  - Progress              │                 │
│  - Insights              │  MAIN CONTENT   │
│  - Logout                │  (flex, scroll) │
│                          │                 │
│                          │                 │
└─────────────────────────────────────────────┘
```

---

## 🔐 Authentication Flow

1. **User visits `/`**
   - Checks localStorage for `tf_token`
   - If token exists: redirects to `/dashboard`
   - If no token: redirects to `/auth`

2. **User at `/auth`**
   - Shows AuthPage component
   - Signup/Signin form
   - On success: saves token + user data, redirects to `/dashboard`

3. **User at any protected route** (e.g., `/dashboard`)
   - ProtectedRoute wrapper checks for token
   - If no token: redirects to `/auth`
   - If token exists: renders page content

---

## 📦 Component Tree

```
AppShell
├── ProtectedRoute
│   └── (checks auth)
├── Sidebar
│   └── Navigation links
├── Topbar
│   └── Page title + user profile
└── Page Content
    └── [Dashboard / Tasks / Goals / etc]
```

---

## 🎨 Design Notes

- **No styling polish yet** - Plain, functional styling
- Colors used: Dark grays (#0F172A), teal accents (#0F766E)
- Responsive: Sidebar fixed at 240px, content area flexible
- All pages use same base styling for consistency

---

## 🚀 Next Steps

1. Start frontend dev server: `npm run dev`
2. Test authentication flow in browser
3. Build out feature pages (replace EmptyState)
4. Add styling/polish later

---

## 📝 Usage Example

**Creating a new authenticated page:**

```javascript
import AppShell from '../components/AppShell'
import EmptyState from '../components/EmptyState'

export default function MyPage() {
  return (
    <AppShell title="My Page Title">
      {/* Your content here */}
      <EmptyState icon="🎯" title="Page Name" description="Page description" />
    </AppShell>
  )
}
```

That's it! The page gets:
- ✓ Authentication protection
- ✓ Sidebar navigation
- ✓ Topbar with title
- ✓ Consistent styling
- ✓ User profile
