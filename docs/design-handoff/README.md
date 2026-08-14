# Backend Handoff: Chez Sanji — Shared Real-Time Backend

## Purpose of this package
This is a **developer implementation brief**, not a design brief. Its only goal: replace the prototype's per-device `localStorage` with a real shared backend so the customer app, the kitchen phone, and the counter iPad all see the same live data. Pair it with `design_handoff_chez_sanji/README.md` (UI/UX reference) — this file focuses purely on data, sync, and API contract.

## Why this is required
The prototype (`Chez Sanj App.dc.html` + `Chez Sanji Dashboard.dc.html`) currently persists everything in the browser's `localStorage`, faking "real-time" only within one browser via `window.addEventListener('storage', ...)` and `setInterval` polling. **Two different devices never see each other's data.** A customer's order placed on their phone will not appear on the kitchen's device, and a staff validation won't reach the customer, unless both happen to share the same browser storage. This must be replaced before any real-world multi-device use.

## Recommended stack
- **Firebase Firestore** or **Supabase (Postgres + Realtime)** — either gives real-time listeners out of the box and a generous free tier, good fit for a single-location fast-food app. Supabase is a good default if the team wants SQL and Row Level Security; Firestore is a good default for the fastest path to real-time listeners with minimal backend code.
- Alternative: a small custom Node/Express (or similar) API + WebSocket server backed by Postgres/MongoDB, if the team wants full control — more work, only worth it if there's already backend infra to reuse.

## Data model (collections / tables)

### `orders`
| Field | Type | Notes |
|---|---|---|
| `ref` | string | e.g. `CSJ-1234`, unique, generated server-side on creation (client-generated refs are a spoofing risk) |
| `pickupCode` | string (4 digits, ≥2000) | shown to customer, used by staff to hand over the order |
| `customerName` | string | |
| `customerPhone` | string | E.164 or local format, consistent — this is the account key |
| `fulfillment` | enum: `Pickup` \| `Delivery` \| `Dine In` | |
| `deliveryAddress` | string, nullable | only for `Delivery` |
| `lines` | array of `{ name, qty, cat, unitPrice }` | itemized order, category included for staff-group message grouping |
| `subtotal`, `deliveryFee`, `discount`, `total` | numbers | keep raw numbers server-side, format as FCFA only in the UI layer |
| `paymentMethod` | enum: `Orange Money` \| `MTN MoMo` \| `Cash` | |
| `paid` | boolean | |
| `pendingValidation` | boolean | true until staff confirms payment — **this must be a server-authoritative flag, not client-settable**, since it gates whether food gets prepared |
| `paymentProofUrl` | string, nullable | uploaded proof image/PDF — store in object storage (Firebase Storage / Supabase Storage), not inline |
| `status` | enum: `active` \| `done` | closed only by explicit staff action |
| `orderStatusIndex` | int 0–3 | 0 Received, 1 Preparing, 2 Ready, 3 Picked up/Delivered |
| `stepDeadline` | timestamp, nullable | when the 7-minute "Preparing" countdown ends — compute server-side when staff validates, don't trust a client-supplied deadline |
| `location` | `{ lat, lng }`, nullable | customer-shared delivery location |
| `createdAt`, `validatedAt`, `deliveredAt` | timestamps | for reporting/exports |

### `accounts` (keyed by phone number, or a real user ID once real auth is added)
| Field | Type | Notes |
|---|---|---|
| `phone` | string | primary key |
| `profileName` | string | |
| `loyaltyPoints` | int | |
| `savedAddress` | string, nullable | |
| `defaultPaymentMethod` | enum | |
| `otpCode`, `otpExpiresAt` | — | **do not store OTP in the client or in plaintext long-term** — see Auth section |

### `menuItems`
| Field | Type | Notes |
|---|---|---|
| `id` | string | stable ID, e.g. `b1`, or a real UUID for new items |
| `cat` | enum: `Combo`, `Burgers`, `Fries`, `Poutine`, `Shakes`, `Cocktails`, `Soft Drinks` | (Fries and Poutine are now separate categories — see recent product change) |
| `name`, `nameFr` | string | |
| `desc`, `descFr` | string | |
| `price` | number (FCFA, integer) | |
| `addOns` | array of `{ label, labelFr, price }` | editable by staff — **this replaces the prototype's separate `menuOverrides` + `addOnOverrides` + `deletedProducts` maps**: just make `menuItems` itself the single mutable source of truth (a `deleted: boolean` flag instead of a separate exclusion map, an `outOfStock: boolean` field instead of a separate map) |
| `outOfStock` | boolean | |
| `deleted` | boolean | soft-delete so historical orders referencing this item still resolve |

### `staff` (real accounts — replaces the shared hardcoded admin passwords)
| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `name` | string | |
| `role` | enum: `cashier` (can validate payments, mark delivered) \| `manager` (also edits menu, prices, deletes orders) | the prototype conflates all of this into one "Mode développeur" — split it |
| `pinHash` | string | **never store the PIN in plaintext** — hash it (bcrypt/argon2) even for a simple PIN-based staff login |

## API / real-time contract
Whichever backend is chosen, the client apps need:
1. **Create order** — customer app calls this at checkout; server generates `ref` and `pickupCode`, sets `pendingValidation: true`, `status: 'active'`, `orderStatusIndex: 0`. Returns the order so the app can show the tracking screen immediately.
2. **Listen to one order** (by `ref`, scoped so a customer can only read their own orders — e.g. by matching `customerPhone` to their authenticated session) — drives the customer's live tracking screen: status changes, validation, ready/delivered.
3. **Listen to active orders** (staff-only, all `status: 'active'`) — drives the kitchen/dashboard live list, replacing today's polling.
4. **Validate payment** (staff-only, requires `manager` or `cashier` role) — takes last-4-digits or full ref, flips `pendingValidation: false`, sets `orderStatusIndex: 1`, computes `stepDeadline = now + 7min` server-side, triggers a push/notification to the customer.
5. **Advance status automatically** — a server-side scheduled function (Cloud Function / Supabase Edge Function on a cron, or a simple timer job) flips `orderStatusIndex` 1→2 when `stepDeadline` passes, instead of the client-side `setInterval` in the prototype (which stops working if the tab isn't open).
6. **Mark delivered** (staff-only) — sets `status: 'done'`, `orderStatusIndex: 3`, timestamps `deliveredAt`.
7. **Menu CRUD** (staff-only, `manager` role) — create/update/soft-delete `menuItems`, toggle `outOfStock`.
8. **Customer OTP login** — see Auth below.

## Real-time push instead of toasts
The prototype shows order-status toasts only if the customer's tab happens to be open. For a real app, add **push notifications** (Firebase Cloud Messaging is the natural fit if using Firestore) so the customer gets "Commande acceptée" / "Commande prête" even with the app closed/backgrounded. Trigger these from the same server-side events that flip `pendingValidation` and `orderStatusIndex`.

## Auth — replace both prototype auth flows
1. **Customer phone login**: the prototype "sends" a 4-digit code via a WhatsApp deep link (`wa.me`) and shows the code in the UI — this is not real OTP delivery. Replace with **Firebase Phone Auth**, **Twilio Verify**, or a local Cameroon SMS gateway (e.g. a provider like Nexmo/Vonage or a regional aggregator that reaches MTN/Orange numbers reliably) that actually sends and server-side-verifies a code — never trust a client-generated code.
2. **Staff access**: the prototype's "Mode développeur" gate (5-tap avatar → shared password/PIN stored in `localStorage`) is a UI Easter egg, not real security — anyone who inspects the app can find the passwords. Replace with real staff accounts (`staff` table above) and a proper login (email+password, or PIN tied to a specific staff ID) gated server-side by role, so `pendingValidation`/menu-edit endpoints reject unauthenticated or under-privileged requests regardless of what the client sends.

## WhatsApp integration — replace copy-paste workflow
The prototype's "Send to staff group" and order-notification flows work by composing a message, copying it to the clipboard, and opening a WhatsApp group invite link — a human still has to paste it manually. For production, use the **WhatsApp Business Cloud API** (Meta) or **Twilio's WhatsApp API** to:
- Post new-order and validated-order messages directly into a staff broadcast/group without manual paste.
- Optionally let customers receive their order confirmation and "ready" notification via WhatsApp message (not just in-app push), which fits the existing product decision to lean on WhatsApp for Cameroon customers.

## Payment proof handling
Currently an `<input type=file>` with no upload destination. Store proof images/PDFs in real object storage (Firebase Storage / Supabase Storage bucket, access-restricted to staff + the order's own customer), and save the resulting URL on the `orders` document (`paymentProofUrl`). Do not store binary blobs in the database itself.

## Reporting / exports
The prototype's "Download all (PDF)" (`window.print()` on a generated HTML page) is fine as a stG-gap but doesn't scale. Once orders live server-side, prefer a real export: a server endpoint that queries `orders` by date range and renders a PDF (e.g. with a headless-browser or PDF-generation library) or a CSV for spreadsheet import.

## Migration checklist
1. Stand up the chosen backend (Firestore/Supabase) with the collections/tables above.
2. Implement customer OTP auth (real SMS) and staff role-based auth.
3. Wire the customer app's checkout flow to call "create order" against the backend instead of `setState` + `localStorage`.
4. Wire the tracking screen to a real-time listener on that one order.
5. Wire the staff dashboard's active-orders list, validation action, and mark-delivered action to the backend (real-time listener + authenticated mutations).
6. Move the 7-minute preparing countdown to a server-side scheduled trigger.
7. Wire menu management (add/edit/delete/stock toggle) to the backend, remove the client-side override maps.
8. Add push notifications for order-status changes.
9. Integrate WhatsApp Business API for staff-group and customer notifications.
10. Add payment-proof file upload to real storage.
11. Only after all of the above: decommission the `localStorage`-based code paths in the prototype.

## Files included
- `Chez Sanj App.dc.html`, `Chez Sanji Dashboard.dc.html` — the current prototype, included for reference so the developer can see exactly which client-side behaviors (state shape, event names, UI triggers) map to which backend operation above. Do not extend these files further as the source of truth once the backend exists — treat them as the last known-good UI spec.
