# Order Management Platform — User Workflow Guide

> Last updated: 2026-05-18  
> Architecture: SaaS (Multi-Tenant) — MERN Stack

---

## System Overview

This is a **multi-tenant SaaS order management platform**. One instance of this software can serve multiple businesses (called **tenants**). Each business has completely isolated data — orders, customers, users, and settings are all scoped to the tenant.

```
Platform Owner (Rabin)
    │
    ├── Tenant: CakeZake (Birtamode)
    │       ├── Admin: cakezake
    │       ├── Staff: staff1, staff2
    │       ├── Rider: rider1
    │       └── Order Processor: kitchen1
    │
    ├── Tenant: Another Bakery
    │       ├── Admin: bakery_admin
    │       └── Staff: baker1
    │
    └── Tenant: Flower Shop XYZ
            └── Admin: flower_admin
```

**No self-registration** — all accounts are created by either the Platform Owner or a Tenant Admin.

---

## Login Credentials

| Account | Login | Password |
|---------|-------|----------|
| Platform Owner | `rawindhakal@gmail.com` OR `rawindhakal` | `Sevya@123` |
| CakeZake Admin (default) | `cakezake` | `cakezake@123` |

> Change passwords immediately after first login via Settings.

---

## Role Reference

| Role | Scope | Access |
|------|-------|--------|
| `platform_owner` | Global | All tenants, no order data |
| `super_admin` | Tenant | Full tenant management |
| `staff` | Tenant | Orders + inbox (no settings/users) |
| `order_processor` | Tenant | Outlet panel only |
| `rider` | Tenant | Delivery panel only |

---

## 1. Platform Owner Workflow (Rabin / rawindhakal@gmail.com)

The Platform Owner is the SaaS operator. They do **not** manage individual orders — they manage which businesses use the platform.

### 1.1 Logging In

1. Go to the app URL (e.g., `https://orders.cakezake.com` or `http://localhost:5173` in dev)
2. Enter `rawindhakal@gmail.com` (or `rawindhakal`) as username
3. Enter password: `Sevya@123`
4. Click **Sign In** → redirected to **Platform Admin** (`/superadmin`)

### 1.2 Platform Admin Dashboard

The `/superadmin` page shows:
- **Total Tenants** count
- **Active Tenants** count
- **Platform-wide Order Count**
- **Platform-wide Revenue**
- List of all tenant cards with stats

### 1.3 Creating a New Tenant (Onboarding a Business)

When a new business wants to use the platform:

1. Click **"Add Tenant"** button
2. Fill in the form:
   - **Business Name** (e.g., "Flower Paradise")
   - **Slug** — auto-generated (e.g., `flower-paradise`), used as unique ID — cannot be changed after creation
   - **Order Prefix** — 2–6 uppercase letters (e.g., `FP`) — orders will be numbered `FP-2025-0001`
   - **Owner Name** — the business owner's name
   - **Owner Email** — business owner's contact email
   - **Phone** — business contact
   - **City** / **Country**
   - **Currency** — default `NPR` for Nepal; change for other countries
   - **Plan** — Free / Basic / Pro (for your subscription tracking)
   - **Notes** — internal notes about this client (payment terms, contract, etc.)
3. Click **Create Tenant**

### 1.4 Creating an Admin User for the Tenant

After creating a tenant, the business needs a login:

1. On the tenant card, click the **person+ icon** (Create Admin)
2. Fill in:
   - **Full Name** (e.g., "Asmita Sharma")
   - **Username** — globally unique across ALL tenants (e.g., `flowerparadise.admin`)
   - **Email** (optional) — they can log in with this email too
   - **Password** — minimum 6 characters
3. Click **Create Admin**

> Share the username and password with the business owner. They can change their password in Settings.

### 1.5 Managing Tenants

| Action | How |
|--------|-----|
| Edit tenant info | Click pencil icon on tenant card |
| Deactivate tenant | Click toggle icon — disables all users in that tenant |
| Activate tenant | Click toggle icon again |
| Delete tenant | Click trash icon — only works if the tenant has 0 orders |

### 1.6 Monitoring Platform Health

The tenant card shows per-tenant:
- Order count (total, not deleted/cancelled)
- User count
- Total revenue

---

## 2. Tenant Admin Workflow (super_admin role)

The Tenant Admin is the business owner or manager who runs day-to-day operations.

**Login**: Use the username/password created by the Platform Owner.

### 2.1 First-Time Setup

After receiving credentials from the Platform Owner:

1. Log in at the app URL
2. Go to **Settings** (`/settings`)
3. **Change Password** immediately (Security section)
4. **Add Outlets** — create at least one outlet (e.g., "Main Branch")
5. **Configure Delivery Cities** (Dynamic Options section)
6. **Configure Cake Flavors, Sizes, etc.** (Dynamic Options)
7. **Set up SMS** (SparrowSMS) for order notifications
8. **Set up Email** (SMTP) for new order alerts
9. **Create staff users** (User Management section)

### 2.2 Creating Staff Users

In **Settings → User Management**:

1. Click **"Add User"**
2. Fill in:
   - **Full Name**, **Username** (globally unique), **Password**
   - **Role**:
     - `Staff` — can manage orders, view inbox
     - `Order Processor` — kitchen/prep panel only (receives orders to prepare)
     - `Rider` — delivery panel only (sees their assigned deliveries)
   - **Assigned Outlets** — which outlet(s) this user can see (leave blank for all)
3. Click **Create User**

### 2.3 Dashboard Overview

The Dashboard (`/dashboard`) shows:
- Date-range picker (defaults to today)
- **Summary cards**: Orders in range, Revenue, Advance Collected, Due Amount, Avg Order Value
- **Active order pipeline**: New → Confirmed → In Production → Out for Delivery
- **Revenue chart** (daily bar/line)
- **Orders by status** (donut chart)
- **Orders by channel** (bar chart)
- **Today's deliveries** list
- **Outlet overview** — per-outlet order count and revenue

### 2.4 Managing Orders

See **Section 3** (Staff workflow) — Tenant Admin has full access to all order operations.

### 2.5 Customers & Payments

**Customers** (`/customers`) — aggregated view of all senders:
- Total orders per customer
- Total amount, advance paid, due balance
- Click a customer → full order history + payment ledger
- Record extra payments (when a customer pays outside the order flow)
- Delete ledger entries

### 2.6 Archive (Deleted Orders)

**Archive** (`/archive`) — view soft-deleted orders:
- Restore accidentally deleted orders
- Permanently deleted items remain archived for audit

### 2.7 Settings

| Section | What you can configure |
|---------|------------------------|
| Outlets | Branches with kitchen and prep area info |
| Change Password | Update your own password |
| SparrowSMS | SMS notifications (Nepal gateway) |
| Email Notifications | SMTP config for new order alerts |
| Backup & Export | Download orders as Excel or JSON backup |
| Import JSON Backup | Restore from a previous backup |
| User Management | Create/edit/delete staff users |
| Dynamic Options | Delivery cities, cake flavors, sizes, flower types, gift types |

### 2.8 Connections (Social Integrations)

**Connections** (`/connections`) — link social media for the inbox:
- Facebook Page
- Instagram Business
- WhatsApp Business
- TikTok

Messages from these platforms appear in **Inbox** and can be linked to orders.

---

## 3. Staff Workflow (staff role)

Staff can create and manage orders. They **cannot** access Settings, Customers, or Archive.

### 3.1 Creating a New Order

Navigate to **New Order** (`/orders/new`) or click the **+** button:

**Section 1 — Sender (Customer Placing Order)**
- Full Name *
- Phone Number * (supports international — Nepal, India, and other codes)
- Social ID (Instagram @handle, Facebook name, etc.)
- Order Channel * (Instagram / Facebook / WhatsApp / Website / Walk-in / Phone Call)

**Section 2 — Items**
- Click **"Add Item"** for each product
- Select Category: Cake / Flower / Gifts / Plant / Chocolate / Combo
- Fill in category-specific fields:
  - **Cake**: flavor, size, shape, layers, message, theme
  - **Flower**: arrangement, type, stems, color, vase
  - **Gifts**: type, wrapping, message
  - **Plant**: type, pot size, pot type
  - **Chocolate**: brand, box type, quantity
- Upload reference images (from customer)
- Enter Price (NPR)
- Running total shown automatically

**Section 3 — Payment**
- Total (auto-calculated, cannot edit)
- Advance Paid — enter amount received
- Due Amount (auto-calculated)
- Payment Method: Cash / eSewa / Khalti / Bank Transfer / QR
- Split Payment — add multiple payment rows if customer pays with multiple methods

**Section 4 — Receiver (Who Receives the Delivery)**
- Receiver Name *
- Receiver Phone *
- City * (from tenant's configured list)
- Landmark

**Section 5 — Delivery**
- Delivery Date * (date picker)
- Time Slot: 7AM–10AM / 10AM–1PM / 1PM–4PM / 4PM–7PM / 7PM–9PM / Anytime
- Fulfillment Type: Delivery / Pickup
- Partner Notes (delivery partner instructions)
- Internal Note (admin-only note)

**Submitting:**
1. Click **Create Order**
2. Order number is generated automatically (e.g., `CZ-2025-0042`)
3. Success toast shown
4. Optionally send SMS confirmation

### 3.2 Order List

**Orders** (`/orders`) — filterable list of all orders:

| Filter | Options |
|--------|---------|
| Status tabs | All / New / Confirmed / In Production / Out for Delivery / Delivered |
| Search | Order number, sender name, phone |
| Date range | Start and end date picker |
| City | Dropdown |
| Channel | Dropdown |

Each row shows:
- Order# | Sender | Items | Total | Due | City | Slot | Status badge

**Quick actions** on each row:
- Click status badge → dropdown to change status inline
- Click row → Order Detail page

### 3.3 Order Detail

**`/orders/:id`** — full order view:

- Header: Order#, Status badge (click to change), Created date, Channel
- **Status timeline** — visual pipeline steps
- **Item list** with per-item status (Pending → Preparing → Prepared)
- **Payment summary** (total, advance, due)
- **Delivery info** with Google Maps landmark link
- **Images** — reference photos + completed product photos
- **Assign Rider** — assign delivery rider for this order
- **Actions**:
  - Edit Order (full form reopen)
  - Send SMS Confirmation
  - Send Delivery Reminder
  - Print Order slip
  - Delete Order (soft delete → goes to Archive)

### 3.4 Editing an Order

- From Order Detail: click **Edit** button
- All fields become editable
- Server recomputes totals (cannot be manipulated client-side)
- Save changes → order updated

### 3.5 Updating Order Status

**Quick update** (from order list):
- Click the status badge on any row → select new status

**From Order Detail**:
- Click the status badge in the header → dropdown

**Status pipeline:**
```
New → Confirmed → In Production → Out for Delivery → Delivered
                                                     ↑ (also via rider signature)
```
- Any status can jump to `Cancelled`

### 3.6 Inbox

**Inbox** (`/inbox`) — unified social media message inbox:
- Messages from Facebook, Instagram, WhatsApp (if connected)
- Click a conversation → view message thread
- Assign a conversation to an order
- Reply directly from the inbox
- Mark as read

---

## 4. Order Processor Workflow (order_processor role)

Order processors work in the **Outlet Panel** — a simplified kitchen/prep view.

### 4.1 Outlet Panel (`/outlet-panel`)

After login, riders are redirected here automatically.

The panel shows:
- **Active orders** for this outlet (or all outlets if unassigned)
- Grouped by status: Confirmed → In Production → Out for Delivery
- Each order card shows: Order#, Items, Delivery time slot, Customer notes

### 4.2 Processing an Order

1. Select an order card
2. Click **"Start Preparing"** → status becomes In Production
3. For each item, mark individual item status:
   - **Pending** → **Preparing** → **Prepared**
   - Upload completed product photo when marking Prepared
4. When all items are prepared → mark order as **"Ready for Delivery"** (Out for Delivery)

---

## 5. Rider Workflow (rider role)

Riders use the **Delivery Panel** on their mobile phone.

### 5.1 Delivery Panel (`/delivery`)

After login, riders are redirected here automatically.

The panel shows only orders assigned to them that are **Out for Delivery**.

Each card shows:
- Order# | Customer name | Receiver name | Address / City / Landmark
- Items summary | Due amount to collect
- Time slot

### 5.2 Completing a Delivery

1. Open the order card
2. View delivery details
3. Collect payment (Due amount)
4. Get receiver's **digital signature** (drawn on the screen)
5. Type receiver's confirmed name
6. Click **"Mark as Delivered"**
   - Order status changes to **Delivered**
   - Signature and delivery timestamp are saved

---

## 6. Customer / Public Workflow

### 6.1 Order Tracking (Public, no login required)

Customers can track their own orders at:
```
https://your-app.com/track
```

Search by:
- **Order number** (e.g., `CZ-2025-0042`)
- **Phone number** (sender or receiver phone)

Shows:
- Order status with visual timeline
- Items ordered
- Delivery date and slot
- Payment summary (total, advance, due)
- Item preparation status (Pending / Preparing / Prepared)
- Completed product photos (when available)
- Delivery signature (after delivery)

---

## 7. Data Architecture (Technical Reference)

### Multi-Tenancy Implementation

All data documents have a `tenantId` field that scopes them to a specific tenant.

```
Orders         → tenantId: ObjectId → Tenant
Outlets        → tenantId: ObjectId → Tenant
Users          → tenantId: ObjectId → Tenant (platform_owner has no tenantId)
Payments       → tenantId: ObjectId → Tenant
AppSettings    → tenantId: ObjectId → Tenant (per-tenant dropdown values)
EmailConfig    → tenantId: ObjectId → Tenant
SmsConfig      → tenantId: ObjectId → Tenant
Counter        → tenantId: ObjectId → Tenant (per-tenant order numbering)
```

### Order Number Format

```
{PREFIX}-{YEAR}-{SEQ}
e.g., CZ-2025-0042
```

- `PREFIX` = tenant's `orderPrefix` field (set when creating the tenant)
- `YEAR` = 4-digit year
- `SEQ` = sequential counter, resets each year, scoped per tenant

### User Roles & Routing

| After Login | Redirect |
|-------------|----------|
| `platform_owner` | `/superadmin` |
| `rider` | `/delivery` |
| `order_processor` | `/outlet-panel` |
| `super_admin` / `staff` | `/dashboard` (or previous URL) |

### Session Management

- Sessions stored in MongoDB via `connect-mongo`
- Session duration: 8 hours (configurable via `SESSION_MAX_AGE`)
- Session is refreshed only once per hour (reduces DB writes)
- Logout destroys session immediately

---

## 8. API Reference (Quick Summary)

### Auth Routes
```
POST  /api/auth/login           { username/email, password }
POST  /api/auth/logout
GET   /api/auth/verify
POST  /api/auth/change-password { currentPassword, newPassword }
```

### Platform Owner Routes (platform_owner only)
```
GET    /api/tenants                    List all tenants with stats
POST   /api/tenants                    Create tenant
GET    /api/tenants/:id                Tenant detail + users
PUT    /api/tenants/:id                Update tenant
PATCH  /api/tenants/:id/toggle         Activate / deactivate
POST   /api/tenants/:id/create-admin   Create admin user for tenant
DELETE /api/tenants/:id                Delete (only if 0 orders)
```

### Order Routes (all tenant users)
```
GET    /api/orders                     List (filters: status, city, channel, search, date)
GET    /api/orders/export?format=xlsx  Download Excel
GET    /api/orders/export?format=json  Full JSON backup
GET    /api/orders/:id                 Order detail
POST   /api/orders                     Create order
PUT    /api/orders/:id                 Update order
PATCH  /api/orders/:id/status          Quick status update
PATCH  /api/orders/:id/assign-rider    Assign rider
POST   /api/orders/:id/sign-delivery   Mark delivered with signature
DELETE /api/orders/:id                 Soft delete
PATCH  /api/orders/:id/restore         Restore from archive
POST   /api/orders/:id/notify          Send SMS confirmation
POST   /api/orders/:id/remind          Send delivery reminder
```

### Stats Routes
```
GET  /api/stats/summary-quick    Fast summary numbers
GET  /api/stats/dashboard        Full dashboard data
```

### Other Tenant Routes
```
GET/POST/PUT/DELETE /api/outlets
GET/POST/PUT/DELETE /api/users
GET                 /api/users/riders
GET/POST/DELETE     /api/customers
GET/PUT             /api/app-settings
GET/PUT/POST        /api/email-config
GET/PUT/POST        /api/sms-config
GET                 /api/track        (public, no auth)
```

---

## 9. Deployment Checklist

### Environment Variables (server/.env)

```env
# Core
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
SESSION_SECRET=<random 32+ char string>
SESSION_MAX_AGE=28800000
HTTPS=true

# Platform Owner
PLATFORM_OWNER_EMAIL=rawindhakal@gmail.com
PLATFORM_OWNER_PASSWORD=<strong password>

# Default tenant admin (first run only)
DEFAULT_ADMIN_PASSWORD=<strong password>

# Cloudinary (image uploads)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# SparrowSMS (Nepal)
SPARROWSMS_TOKEN=...

# Client URL (for CORS)
CLIENT_URL=https://yourdomain.com
```

### First-Run Sequence

1. Deploy server + client
2. Server starts → auto-seeds platform owner + CakeZake tenant
3. Login as `rawindhakal@gmail.com` / `Sevya@123` to verify Platform Admin works
4. Login as `cakezake` / `cakezake@123` to verify tenant admin works
5. **Change both passwords immediately**
6. Create outlets, configure settings

---

## 10. Security Notes

- Passwords are hashed with bcrypt (10 rounds)
- Sessions stored server-side (cannot be tampered client-side)
- `tenantId` on all data prevents cross-tenant data access
- `platform_owner` role cannot create orders or access tenant data via normal routes
- Rate limiting on login: max 10 attempts per minute per IP
- All `/api/*` routes (except `/api/auth/login`, `/api/track`) require a valid session
- Helmet.js sets secure HTTP headers
- CORS restricted to configured `CLIENT_URL` in production
