# CakeZake — TODO

## Unified Social Inbox (Not Started)

Build a social media management inbox inside the OMS so staff can chat with customers from all platforms in one place. Each outlet connects its own accounts.

### Platform APIs (all free)

| Platform | API | Free Limit | Notes |
|---|---|---|---|
| WhatsApp | Meta Cloud API (direct, no Twilio) | 1,000 conversations/month | Each outlet needs a WhatsApp Business number |
| Instagram DMs | Meta Graph API | Unlimited | Must be Professional account linked to FB Page |
| Facebook Messenger | Meta Graph API | Unlimited | Same Meta App as Instagram |
| TikTok | Comment management only | — | DM API is gated to approved partners only |

---

### New DB Models Needed

```javascript
SocialAccount {
  outlet, platform, label, pageId,
  accessToken (encrypted), webhookVerifyToken, isActive
}

Conversation {
  account, outlet, platform, externalId,
  customerName, customerHandle, customerAvatar,
  linkedCustomer, assignedTo,
  status: 'open' | 'resolved' | 'snoozed',
  unreadCount, lastMessageAt
}

Message {
  conversation, direction: 'inbound' | 'outbound',
  body, mediaUrl, mediaType, externalId,
  sentBy, sentAt, readAt
}
```

---

### New API Routes Needed

```
GET/POST/DELETE  /api/social/accounts
GET              /api/social/connect/facebook        → Meta OAuth redirect
GET              /api/social/connect/callback        → token exchange
POST             /api/social/connect/whatsapp        → manual token entry

GET/POST         /api/social/webhook/:accountId      → platform webhooks (public)

GET              /api/social/conversations           → list with filters
GET              /api/social/conversations/:id       → single + messages
PATCH            /api/social/conversations/:id       → assign / resolve / snooze
POST             /api/social/conversations/:id/link  → link to Customer
GET              /api/social/conversations/:id/messages
POST             /api/social/conversations/:id/reply → send via platform API
```

---

### New Frontend Pages Needed

- `/inbox` — unified inbox (tabs: All / WhatsApp / Instagram / Facebook / TikTok, filter by outlet/assigned/unread)
- `/inbox/:id` — conversation view (chat bubbles, reply box, link to customer/order, assign staff)
- Settings → Connected Accounts (per-outlet: connect/disconnect each platform via OAuth or token form)

---

### Real-time
- Add Socket.io to server
- Emit `new_message` and `new_conversation` events
- Unread badge on Inbox nav item

---

### Build Order
- [x] 1. DB models (SocialAccount, Conversation, Message)
- [x] 2. Webhook receivers — WhatsApp
- [x] 3. Webhook receivers — Instagram + Facebook (same Meta App)
- [x] 4. Meta OAuth connect flow
- [x] 5. Conversations + messages CRUD API
- [x] 6. Socket.io real-time setup
- [x] 7. Frontend: `/inbox` unified inbox page
- [x] 8. Frontend: `/connections` manage accounts page
- [ ] 9. TikTok comment management (requires TikTok Business API approval)

---

### Meta App Setup (do before building)
1. Go to developers.facebook.com → Create App → Business type
2. Add products: Messenger, Instagram, WhatsApp
3. Get a permanent Page Access Token per outlet page
4. Set webhook URL to: `https://orders.cakezake.com/api/social/webhook/:accountId`
5. Subscribe to: `messages`, `messaging_postbacks`, `instagram_messages`

---

## Other Pending Ideas
- Google Sheets backup for orders
- Nepali BS calendar in date pickers
- Bulk WhatsApp message broadcast to customers
- Customer loyalty points tracking
