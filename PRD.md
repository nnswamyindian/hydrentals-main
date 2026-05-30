# Product Requirements Document (PRD): Hydrentals

## 1. Executive Summary
**Hydrentals** is a comprehensive, full-stack web application designed for property rentals. It connects prospective tenants with property owners, providing tools for searching, comparing, and managing rental properties. The platform includes a robust administrative backend for user moderation, property validation, and dispute resolution.

## 2. Target Audience
- **Tenants/Renters:** Users looking for rental properties. They can search via lists or maps, compare properties manually, save favorites, calculate estimated rent, and contact property owners.
- **Property Owners/Landlords:** Users who want to list their properties. They can add listings, manage their properties via a dedicated dashboard, and communicate with interested tenants.
- **Administrators:** Platform moderators who verify users, approve property listings, handle complaints, and manage global settings.

## 3. Core Features & Functionality

### 3.1 Authentication & User Management
- **Registration/Login:** Secure sign up, login, and password recovery (`/auth`, `/forgot-password`, `/reset-password`).
- **Role-Based Access Control (RBAC):** Three primary user roles: `user` (tenant), `owner`, and `admin`.
- **User Dashboard:** Dedicated personalized dashboards based on roles (`/dashboard`).
- **Profile & Settings:** User profile management and account settings (`/settings`).

### 3.2 Property Discovery (Tenants)
- **Property Listings:** Browse available properties with various search and filtering options (`/properties`).
- **Map View:** Interactive map integration to discover properties by their geographic location (`/map`).
- **Property Details:** Detailed view of each property including image carousels, amenities, pricing, and precise location (`/property/:id`).
- **Favorites:** Ability for users to save properties to view later (`/favorites`).
- **Compare:** A dedicated interface to compare different properties side-by-side (`/compare`).

### 3.3 Tenant Utilities
- **Rent Calculator:** Built-in tool to estimate monthly rent and associated moving costs (`/rent-calculator`).
- **Intelligent Assistant:** AI-assisted chatbot for quick property inquiries or navigation help (`Chatbot` component).

### 3.4 Property Management (Owners)
- **List Property:** Form to list new properties with comprehensive details, image uploads, and pricing models (`/add-property`).
- **My Properties:** An owner-specific dashboard to manage existing active and inactive listings (`/my-properties`).

### 3.5 Communication & Notifications
- **Messaging System:** In-app P2P messaging system between tenants and property owners (`/messages`).
- **Notifications Hub:** Real-time or in-app alerts for new messages, application status updates, or systemic updates (`/notifications`).

### 3.6 Administration Suite
A protected suite of tools restricted strictly to role `[admin]`:
- **Admin Properties:** Review, approve, reject, or forcefully remove property listings (`/admin/properties`).
- **Admin Users:** Manage all registered users on the platform, including moderation actions (`/admin/users`).
- **Admin Verifications:** Handle identity verifications or property legal verifications (`/admin/verifications`).
- **Admin Complaints:** Review and resolve user-submitted complaints and disputes (`/admin/complaints`).
- **Admin Settings:** Global platform configuration and operational tuning (`/admin/settings`).

## 4. Technical Architecture & Tech Stack

### 4.1 Frontend Architecture
- **Framework:** React 18
- **Build Tool:** Vite
- **Language:** TypeScript
- **Routing:** React Router DOM (v6 for client-side routing)
- **State Management & Data Fetching:** React Query (@tanstack/react-query) for caching and synchronizing asynchronous data.

### 4.2 UI/UX & Design System
- **Styling:** Tailwind CSS
- **UI Components:** `shadcn/ui` ecosystem (built on top of Radix UI primitives and styled with Tailwind and class-variance-authority).
- **Icons:** Lucide React
- **Forms & Validation:** React Hook Form bound with Zod schema validation.
- **Mapping Services:** Leaflet combined with `@types/leaflet`.
- **Data Visualization:** Recharts for chart-based data representation.
- **Internationalization:** Context-based custom `LanguageProvider` implementation.
- **Responsive Layout:** Mobile-friendly structure heavily reliant on `MobileBottomNav` for compact screens.

### 4.3 Backend & Infrastructure Setup
- **Backend-as-a-Service (BaaS):** Supabase acts as the primary back-end infrastructure.
  - **Database:** PostgreSQL for relational data mapping.
  - **Authentication:** Supabase Auth for JWT issuance and security.
  - **Storage:** Blob storage for property image and document handling.

### 4.4 Tooling & Quality Assurance
- Code quality maintained via `ESLint` and `typescript-eslint`.
- Unit and integration testing powered by `Vitest` and `@testing-library/react`.
- Formatter integrated with `postcss` and `autoprefixer`.

## 5. Non-Functional Requirements
- **Responsive Web Design (RWD):** Fluid layout structure functioning seamlessly across all device sizes (desktop, tablet, mobile).
- **Security & Route Guarding:** Strict implementation of `ProtectedRoute` wrapper guarding private routes by scanning roles (e.g., `['owner', 'admin']`).
- **Performance Optimization:** Minimal initial payload achieved via Vite code-splitting and efficient remote state caching using React Query.

## 6. Future Roadmap (Proposed Considerations)
- **Payment Gateway Integration:** In-app capability to process rent payments, security deposits, and background check fees.
- **Digital Lease Signing:** Implementation of e-signatures for secure, on-platform lease agreements.
- **Virtual Property Tours:** Integration with 3D models or 360-degree interactive camera views.
- **Advanced Machine Learning Matches:** Suggesting properties to tenants based on behavior patterns and explicit search preferences.
