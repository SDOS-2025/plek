# Plek - Meeting Room Booking Application

Plek is a full-stack web application for managing room bookings in an institutional or corporate environment. It provides a robust backend built with Django and a modern frontend using React, with features for users, coordinators, and administrators.

---

## Table of Contents

- Features
- Architecture Overview
- Backend Structure
- Frontend Structure
- Key Modules
- User Roles & Permissions
- Booking Workflow
- Analytics & Audit
- Testing & Data Generation
- Styling & UI
- How to Run
- API Overview
- Extending the System

---

## Features

- **Room Booking:** Users can search, book, and manage room reservations.
- **Role Management:** Supports Users, Coordinators, Administrators, and Superadmins.
- **Approval Workflow:** Bookings may require approval based on user role and policy.
- **Resource Management:** Admins can manage rooms, buildings, floors, amenities, and departments.
- **Analytics:** Visual dashboards for room usage, booking trends, and user activity.
- **Audit Logging:** All critical actions are logged for traceability.
- **Chatbot:** Users can interact with a chatbot for booking and support.
- **Responsive UI:** Modern, mobile-friendly interface.

---

## Architecture Overview

- **Backend:** Django REST Framework, SQLite (default), modular apps for accounts, bookings, rooms, analytics, audit, etc.
- **Frontend:** React (Vite), Tailwind CSS, modular components and pages.
- **APIs:** RESTful endpoints for all resources, authentication, and analytics.
- **Testing:** Django test cases and scripts for generating test data.

---

## Backend Structure

Located in `backend/`:

- **accounts/**: User authentication, profile, and role/group management.
- **bookings/**: Booking models, approval logic, and endpoints.
- **rooms/**: Room, building, floor, amenity, and department management.
- **analytics/**: Aggregated statistics and reporting endpoints.
- **audit/**: Logging of user/system actions (`audit/admin.py`).
- **chatbot/**: Chatbot logic and endpoints.
- **core/**, **checks/**, **notifications/**: Supporting modules.
- **scripts/**: Utilities like `generate_test_data.py`.
- **manage.py**: Django management.

---

## Frontend Structure

Located in `frontend/`:

- **src/components/**: Reusable UI components (e.g., NavBar, ConfirmBooking, ModifyBooking).
- **src/pages/**: Page-level components for user/admin dashboards, analytics, booking, etc.
- **src/context/**: React context providers (Auth, Policy).
- **src/utils/**: Utility functions for formatting, API, bookings, etc.
- **src/index.css**: Tailwind CSS and custom styles.
- **App.jsx**: Main app router.
- **main.jsx**: Entry point.

---

## Key Modules

### Bookings

- Users can create, view, modify, and cancel bookings.
- Bookings may require approval (by coordinator/admin) depending on user role and policy.
- Bookings are associated with rooms, time slots, and purposes.

### Rooms & Resources

- Admins can manage rooms, buildings, floors, amenities, and departments.
- Rooms have capacity, amenities, and can be filtered/searched.

### User Management

- Roles: User, Coordinator, Admin, Superadmin.
- Coordinators manage bookings for assigned floors/departments.
- Admins manage all resources and users.

### Analytics

- Dashboards for booking trends, room utilization, top users, and more.
- Visualized using charts.

### Audit & System Logs

- All critical actions (booking, approval, changes) are logged in `AuditLog` and `SystemLog`.
- Logs are read-only in the admin interface.

### Chatbot

- Users can interact with a chatbot for booking, modifying, or cancelling reservations.
- Chatbot integrates with backend logic for bookings.

---

## User Roles & Permissions

- **User:** Can book rooms and manage their own bookings.
- **Coordinator:** Can approve bookings for assigned floors/departments.
- **Administrator:** Can manage all rooms and promote users.
- **Superadmin:** Full access, including institute policies.

Role logic is enforced in both backend (Django permissions) and frontend (conditional UI).

---

## Booking Workflow

1. **User selects room, date, and time slot.**
2. **Booking is created:**  
   - If auto-approval is enabled or user is privileged, booking is approved instantly.
   - Otherwise, booking is marked as pending for coordinator/admin approval.
3. **Approval:**  
   - Coordinators/admins review and approve/reject bookings.
   - Users are notified of status changes.
4. **Modification/Cancellation:**  
   - Users can modify/cancel bookings (subject to policy and approval).

---

## Analytics & Audit

- **Analytics:**  
  - Room utilization, peak hours, top users, etc.  
  - Data fetched from `/api/analytics/` endpoints and visualized in admin dashboard.
- **Audit Logs:**  
  - All actions are logged with timestamp, user, action, and details.
  - Logs are accessible in Django admin, read-only.

---

## Testing & Data Generation

- **Unit Tests:**  
  - Example: `rooms/tests.py` for amenities and room APIs.
- **Test Data:**  
  - `scripts/generate_test_data.py` creates sample users, rooms, bookings, etc.

---

## Styling & UI

- **Tailwind CSS:**  
  - Custom theme in `tailwind.config.js`.
  - Utility classes and custom components in `index.css`.
- **Responsive Design:**  
  - Layouts adapt to mobile and desktop.

---

## How to Run

### Backend

1. Install dependencies:  
   ```
   pip install -r backend/requirements.txt
   ```
2. Run migrations:  
   ```
   python backend/manage.py migrate
   ```
3. Create superuser:  
   ```
   python backend/manage.py createsuperuser
   ```
4. Start server:  
   ```
   python backend/manage.py runserver
   ```

### Frontend

1. Install dependencies:  
   ```
   cd frontend
   npm install
   ```
2. Start dev server:  
   ```
   npm run dev
   ```

---

## API Overview

- **Authentication:** `/api/auth/`
- **Bookings:** `/api/bookings/`
- **Rooms:** `/api/rooms/`
- **Buildings/Floors:** `/api/buildings/`, `/api/floors/`
- **Amenities:** `/api/amenities/`
- **Analytics:** `/api/analytics/`
- **Audit Logs:** `/api/audit/`
- **Chatbot:** `/api/chatbot/`

See `frontend/src/api.js` and backend viewsets for details.

---

## Extending the System

- **Add new resources:** Extend models and admin in backend, update frontend forms.
- **Customize policies:** Update policy logic in backend and `PolicyProvider` in frontend.
- **Integrate calendar:** Extend booking logic and add calendar sync in frontend/backend.
- **Add notifications:** Use `notifications/` for email/SMS.

---

For more, see the codebase and explore