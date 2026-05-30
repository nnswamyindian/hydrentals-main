

# Fix Plan: Comprehensive Bug Fixes

## Issues Found

### 1. TenantDashboard Uses Mock Data for Favorites (Critical)
`TenantDashboard.tsx` (line 11, 84-86) imports `mockProperties` and matches favorites against them. Since mock properties have fake IDs (`'1'`, `'2'`), the wishlist section will never show real favorited properties.

### 2. Missing `/my-properties` Route
The Owner Dashboard links to `/my-properties` (line 31, 201) but no such route exists in `App.tsx`. Clicking "My Properties" leads to a 404 page.

### 3. Missing `/admin/settings` Route
The Admin Dashboard links to `/admin/settings` (line 36) but this route doesn't exist. Clicking "Platform Settings" leads to 404.

### 4. Missing `/notifications` Route
The Tenant Dashboard links to `/notifications` (line 234) but no such route exists.

### 5. Login Failure for `nnswamyindian@gmail.com`
The session replay shows the user tried logging in with this email and got "Invalid email or password." This is a credentials issue (wrong password or unregistered account), not a code bug. No fix needed.

### 6. Console Warning: Badge Ref in AdminUsers
The `getRoleBadge` function returns `<Badge>` components wrapped in `<span>` tags (line 192). The warning is cosmetic and doesn't break functionality, but can be fixed by removing the unnecessary `<span>` wrapper.

---

## Technical Changes

### File: `src/components/dashboard/TenantDashboard.tsx`
- Remove `import { mockProperties }` (line 11)
- Replace mock-based favorite matching with a real database fetch: query `properties` table using the favorite `property_id` values
- Show real property cards in the wishlist section

### File: `src/App.tsx`
- Add a route for `/my-properties` that shows the owner's properties (can reuse Properties page with owner filter, or redirect to `/properties?owner=me`)
- Add a route for `/notifications` (simple notifications list page)
- Add a route for `/admin/settings` (placeholder admin settings page)

### File: `src/pages/MyProperties.tsx` (new file)
- Create a simple page that fetches properties where `owner_id = user.id`
- Shows all property statuses (pending, approved, rejected) with management options

### File: `src/pages/Notifications.tsx` (new file)
- Create a notifications list page that fetches from the `notifications` table
- Shows all notifications with read/unread status and mark-as-read functionality

### File: `src/pages/admin/AdminSettings.tsx` (new file)
- Create a placeholder admin settings page with basic platform configuration options

### File: `src/pages/admin/AdminUsers.tsx`
- Remove `<span>` wrapper around Badge in `getRoleBadge` calls (line 192) to fix the ref warning

---

## Priority Order
1. Fix TenantDashboard mock data usage
2. Create MyProperties page and route
3. Create Notifications page and route
4. Create AdminSettings placeholder
5. Fix Badge ref warning

