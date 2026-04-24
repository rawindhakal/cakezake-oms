# CakeZake Social Inbox — Setup & Connection Guide

---

## Overview

The Social Inbox lets you receive and reply to messages from:
- **WhatsApp Business** (via Meta Cloud API — free)
- **Instagram DMs** (via Meta Graph API — free)
- **Facebook Messenger** (via Meta Graph API — free)
- **TikTok** (comment management — requires TikTok Business API approval)

All platforms share one Meta App. You only create the app once, then connect as many outlet pages/numbers as you want.

---

## Part 1 — Create a Meta Developer App (One-time setup)

### Step 1 — Create Meta Business Account
1. Go to [business.facebook.com](https://business.facebook.com)
2. Click **Create Account** → fill business name (CakeZake), your name, email
3. Verify your email

### Step 2 — Create a Meta Developer App
1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click **My Apps → Create App**
3. Select app type: **Business**
4. App name: `CakeZake OMS` (or any name)
5. App contact email: your email
6. Business account: select your CakeZake business account
7. Click **Create App**

### Step 3 — Add Products to your App
On your app dashboard, click **Add Product** and add all three:
- ✅ **WhatsApp** → click Set Up
- ✅ **Messenger** → click Set Up
- ✅ **Instagram** → click Set Up

### Step 4 — Get your App ID and App Secret
1. Go to **App Settings → Basic**
2. Copy **App ID** → paste into CakeZake: Connections → API Configuration → Meta App ID
3. Click **Show** next to App Secret → copy it → paste into Meta App Secret
4. Set a **Webhook Verify Token** — make up any random string (e.g. `cakezake-webhook-2025`) → save it in both:
   - CakeZake: Connections → API Configuration → Webhook Verify Token
   - You'll also enter this exact string in the Meta webhook setup later

### Step 5 — Set Server URL
In CakeZake Connections → API Configuration → Server URL:
```
https://orders.cakezake.com
```
This is needed so the Meta OAuth callback redirects correctly.

---

## Part 2 — Connect WhatsApp Business

Each outlet needs its own WhatsApp Business phone number.

### Step 1 — Add a phone number
1. In your Meta App, go to **WhatsApp → API Setup**
2. Under "Step 1: Select phone number", click **Add phone number**
3. Enter the outlet's WhatsApp Business number
4. Verify via SMS or call

### Step 2 — Get the Phone Number ID
1. In **WhatsApp → API Setup**, under the phone number you just added
2. Copy the **Phone number ID** (looks like: `123456789012345`) — this is NOT the phone number itself
3. You'll need this when adding the account in CakeZake

### Step 3 — Generate a Permanent Access Token
**Important:** The test token in the API setup page expires in 24 hours. You need a permanent one.

1. Go to **Business Settings** (business.facebook.com → Settings)
2. Go to **Users → System Users**
3. Click **Add** → name it `cakezake-system-user` → role: **Admin**
4. Click on the system user → click **Add Assets**
5. Select **Apps → your CakeZake app** → give **Full control**
6. Click **Generate New Token**
7. Select your app
8. Select permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
9. Click **Generate Token** → copy it immediately (won't show again)

### Step 4 — Add the WhatsApp account in CakeZake
1. Go to **Connections** in the sidebar
2. Click **Add Account**
3. Fill in:
   - **Outlet**: select the outlet this number belongs to
   - **Platform**: WhatsApp
   - **Display Label**: e.g. `Birtamode WhatsApp`
   - **Phone Number ID**: paste the ID from Step 2
   - **Access Token**: paste the permanent token from Step 3
4. Click **Save Account**

### Step 5 — Set up the Webhook
1. In your Meta App, go to **WhatsApp → Configuration**
2. Under **Webhook**, click **Edit**
3. **Callback URL**:
   ```
   https://orders.cakezake.com/api/social/webhook/meta
   ```
4. **Verify token**: enter the exact same string you set in CakeZake (Step 4 of Part 1)
5. Click **Verify and Save**
6. Under **Webhook fields**, click **Manage** and subscribe to:
   - ✅ `messages`
   - ✅ `message_deliveries`
   - ✅ `message_reads`

### Step 6 — Test it
Send a WhatsApp message to your business number from any phone. It should appear in **Inbox** within seconds.

---

## Part 3 — Connect Instagram DMs

Instagram DMs require an Instagram Professional account linked to a Facebook Page.

### Prerequisites
- Instagram account must be **Professional** (Business or Creator)
- Instagram account must be **linked to a Facebook Page**
  - Go to Instagram app → Settings → Account → Linked accounts → Facebook → connect

### Step 1 — Connect via Meta OAuth (easiest)
1. In CakeZake, go to **Connections**
2. In the **Add Account** form, select the **outlet**
3. Click **Connect via Meta** button
4. A Meta login popup will open — log in with the Facebook account that manages your pages
5. Grant all requested permissions
6. You'll be redirected back — CakeZake will automatically import all connected Facebook Pages and their linked Instagram accounts

### Step 2 — Subscribe to Instagram webhook
1. In your Meta App, go to **Instagram → Webhooks** (or **Webhooks** in the left menu)
2. Click **Subscribe to this object** for Instagram
3. Same webhook URL and verify token as WhatsApp:
   ```
   https://orders.cakezake.com/api/social/webhook/meta
   ```
4. Subscribe to webhook fields:
   - ✅ `messages`
   - ✅ `messaging_postbacks`
   - ✅ `messaging_seen`

### Step 3 — Enable Instagram messaging in app settings
1. In your Meta App, go to **Instagram → Settings**
2. Toggle ON: **Allow access to Instagram messages via API**

### Step 4 — Test it
Send a DM to your Instagram account from another account. It should appear in the Inbox.

---

## Part 4 — Connect Facebook Messenger

Facebook Messenger connects automatically when you do the Meta OAuth flow (Part 3, Step 1). Each Facebook Page gets its own connected account.

### Manual token entry (if OAuth didn't work)
1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your app
3. Click **Generate Access Token**
4. Under **User or Page token**, select the Facebook Page
5. Add permissions: `pages_messaging`, `pages_read_engagement`
6. Click **Generate Token** → copy it
7. In CakeZake → Add Account:
   - Platform: Facebook
   - Page ID: your Facebook Page ID (found in Page Settings → About → Page ID)
   - Access Token: paste the token

### Subscribe to Messenger webhook
1. In your Meta App, go to **Messenger → Settings**
2. Under **Webhooks**, click **Add Callback URL**
3. Same URL and verify token
4. Subscribe to: `messages`, `messaging_postbacks`, `messaging_reads`

---

## Part 5 — App Review (Required for Live Messages)

By default, your Meta App is in **Development Mode** — it can only receive messages from:
- Facebook accounts listed as App Testers or Developers
- Your own test accounts

To receive messages from **real customers**, you must submit for App Review:

1. In your Meta App, go to **App Review → Permissions and Features**
2. Request these permissions:
   - `pages_messaging` — for Messenger
   - `instagram_manage_messages` — for Instagram DMs
   - `whatsapp_business_messaging` — for WhatsApp
3. For each permission, provide:
   - A **screencast video** showing the feature in use
   - A written description of how you use it
4. Submit for review
5. WhatsApp typically takes **1–3 days**
6. Instagram and Messenger can take **1–2 weeks**

> **Note:** WhatsApp Business Cloud API messages work without app review as long as you're messaging numbers that have opted in or initiated the conversation first (customer messages you first).

---

## Part 6 — TikTok Setup

TikTok DM API is **restricted** — only available to approved marketing partners. What CakeZake supports is **comment management**.

### Apply for TikTok Business API Access
1. Go to [developers.tiktok.com](https://developers.tiktok.com)
2. Create an account and verify your business
3. Create an app → select **Content Posting API** and **Comment API**
4. Apply for **Comment Management** access
5. Once approved:
   - Go to your app → copy **Client Key** and **Client Secret**
   - Paste them in CakeZake: Connections → API Configuration → TikTok Client Key / Secret

> TikTok Business API approval can take 2–4 weeks and requires a business use case description.

---

## Part 7 — Managing the Inbox

### Accessing the Inbox
- Click **Inbox** in the sidebar
- A red badge shows unread message count

### Platform filters
- Click **All** / **WhatsApp** / **Instagram** / **Facebook** / **TikTok** tabs to filter
- Use **Active / Resolved / Snoozed** tabs to manage conversation state

### Replying to messages
1. Click on any conversation in the list
2. Type your reply in the box at the bottom
3. Press **Enter** or click the send button
4. The reply is sent directly via the platform API

### Assigning conversations
1. Open a conversation
2. Click the person icon (top right of chat)
3. Select a staff member from the **Assigned to** dropdown
4. The conversation now shows under that staff member's workload

### Resolving conversations
- Click **Resolve** button in the chat header when done
- Resolved conversations move to the **Resolved** tab
- Click **Reopen** to bring them back to active

### Linking to an order
1. Open a conversation → click person icon
2. Under **Linked Order**, type the order number
3. Select from the search results
4. The conversation is now linked — useful for tracking which chat led to which order

---

## Part 8 — Connecting Multiple Outlets

Each outlet can have its own set of accounts:

| Outlet | WhatsApp | Instagram | Facebook |
|--------|----------|-----------|----------|
| Birtamode | +977-9812345678 | @cakezake_birtamode | CakeZake Birtamode |
| Damak | +977-9823456789 | @cakezake_damak | CakeZake Damak |

To add multiple outlets:
1. Repeat Part 2 (WhatsApp) for each outlet's number — each gets its own Phone Number ID and token
2. For Instagram/Facebook: run the Meta OAuth flow once per Facebook account that manages those pages — all pages are imported automatically
3. In CakeZake, each account card shows which outlet it belongs to

Staff assigned to an outlet will only see conversations from that outlet's accounts.

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Webhook verification fails (403) | Wrong verify token | Make sure the token in Meta dashboard exactly matches the one in CakeZake API Configuration |
| Messages not arriving | Webhook not subscribed | Check webhook field subscriptions in Meta App dashboard |
| "META_APP_ID not configured" error | Missing config | Go to Connections → API Configuration → fill in Meta App ID |
| OAuth redirect fails | Wrong Server URL | Set Server URL in API Configuration to `https://orders.cakezake.com` (no trailing slash) |
| App in Development Mode | Not submitted for review | Test accounts work; submit App Review for live use |
| Instagram not appearing after OAuth | Not linked to Facebook Page | Link Instagram account to a Facebook Page first |
| Token expired | Short-lived token used | Use System User permanent token (Part 2, Step 3) |

---

## Quick Checklist

### First-time setup
- [ ] Created Meta Business Account
- [ ] Created Meta Developer App (type: Business)
- [ ] Added WhatsApp, Messenger, Instagram products
- [ ] Set Meta App ID, App Secret, Webhook Verify Token in Connections → API Configuration
- [ ] Set Server URL in API Configuration

### Per WhatsApp number
- [ ] Phone number verified in Meta App
- [ ] Phone Number ID copied
- [ ] Permanent System User token generated
- [ ] Account added in CakeZake Connections
- [ ] Webhook subscribed with correct fields

### Per Instagram account
- [ ] Instagram account is Professional type
- [ ] Instagram linked to Facebook Page
- [ ] Meta OAuth flow completed in CakeZake
- [ ] Instagram messaging enabled in Meta App settings
- [ ] Webhook subscribed

### Per Facebook Page
- [ ] Page access token generated (automatic via OAuth, or manual via Graph Explorer)
- [ ] Messenger webhook subscribed

### Going live
- [ ] App Review submitted for each permission
- [ ] App switched to Live mode in Meta App dashboard
