# GatePass

Real-time visitor and parcel management system for apartment complexes. Security guards and residents use separate apps that stay in sync through a NestJS API with Socket.IO and Redis Pub/Sub â€” no polling, all push.

## Stack

| Layer | Technology |
|---|---|
| Security Frontend | React 18, Vite, Tailwind CSS, React Router, Socket.IO Client |
| Resident Frontend | React 18, Vite, Tailwind CSS, React Router, Socket.IO Client |
| API | NestJS 10, TypeORM 0.3, Socket.IO 4, class-validator |
| Database | PostgreSQL 16 |
| Event Bus | Redis 7 Pub/Sub |
| Containerisation | Docker, Docker Compose |

## Architecture

```mermaid
flowchart LR
    S[gatepass-security\nReact :5173] -- REST + Socket.IO --> A
    R[gatepass-resident\nReact :5174] -- REST + Socket.IO --> A

    subgraph gatepass-api [:4001]
        A[NestJS + TypeORM]
        SUB[DeliverySubscriberService]
        GW[AppGateway\nSocket.IO]
    end

    A -- SQL --> P[(gatepass-db\nPostgreSQL 16)]
    A -- publish --> X[(gatepass-redis\nRedis 7)]
    X -- subscribe --> SUB
    SUB -- broadcastDeliveryEvent --> GW
    GW -- delivery:event --> S
    GW -- delivery:event --> R
```

### How it works

Everything runs inside the `gatepass-api` process. There is no separate notification service.

1. A REST call mutates PostgreSQL via TypeORM.
2. `EventsService` publishes a JSON event to the Redis `delivery-events` channel.
3. `DeliverySubscriberService` (an in-process Redis subscriber) receives the event, deduplicates it by `type:id`, and calls `AppGateway.broadcastDeliveryEvent()` directly â€” no network hop.
4. `AppGateway` emits `delivery:event` to the correct Socket.IO rooms.

## Containers

| Container | Image | Port | Role |
|---|---|---|---|
| `gatepass-db` | postgres:16-alpine | internal | PostgreSQL, data persisted in `postgres_data` volume |
| `gatepass-redis` | redis:7-alpine | internal | Redis with AOF persistence |
| `gatepass-api` | gatepass-api (multi-stage build) | 4001 | NestJS REST + Socket.IO + Redis subscriber |
| `gatepass-security` | gatepass-security (Vite) | 5173 | Security guard web app |
| `gatepass-resident` | gatepass-resident (Vite) | 5174 | Resident web app |

## Project Structure

```text
visitor-management/
â”œâ”€â”€ gatepass-api/                      NestJS backend
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ main.ts                    Bootstrap: CORS, validation pipe, body limit, graceful shutdown
â”‚   â”‚   â”œâ”€â”€ app.module.ts              Root module: TypeORM config, feature module imports
â”‚   â”‚   â”œâ”€â”€ users/
â”‚   â”‚   â”‚   â”œâ”€â”€ user.entity.ts         TypeORM entity â€” users table
â”‚   â”‚   â”‚   â”œâ”€â”€ users.service.ts       Login validation, resident/officer queries
â”‚   â”‚   â”‚   â””â”€â”€ users.controller.ts    POST /users/login/*, GET /users/residents, /users/security
â”‚   â”‚   â”œâ”€â”€ deliveries/
â”‚   â”‚   â”‚   â”œâ”€â”€ delivery.entity.ts     TypeORM entity â€” deliveries table
â”‚   â”‚   â”‚   â”œâ”€â”€ deliveries.service.ts  Business logic, publishes Redis events
â”‚   â”‚   â”‚   â”œâ”€â”€ deliveries.controller.ts
â”‚   â”‚   â”‚   â””â”€â”€ dto/
â”‚   â”‚   â”‚       â”œâ”€â”€ create-delivery.dto.ts
â”‚   â”‚   â”‚       â””â”€â”€ query-delivery.dto.ts
â”‚   â”‚   â”œâ”€â”€ chat/
â”‚   â”‚   â”‚   â”œâ”€â”€ chat-message.entity.ts TypeORM entity â€” chat_messages table
â”‚   â”‚   â”‚   â”œâ”€â”€ chat.service.ts        Thread history and persistence
â”‚   â”‚   â”‚   â””â”€â”€ chat.controller.ts     GET /chat/history, GET /chat/threads
â”‚   â”‚   â”œâ”€â”€ watchlist/
â”‚   â”‚   â”‚   â”œâ”€â”€ watchlist.entity.ts    TypeORM entity â€” watchlist table
â”‚   â”‚   â”‚   â”œâ”€â”€ watchlist.service.ts   ILIKE name match + exact phone match
â”‚   â”‚   â”‚   â”œâ”€â”€ watchlist.controller.ts
â”‚   â”‚   â”‚   â””â”€â”€ dto/create-watchlist.dto.ts
â”‚   â”‚   â”œâ”€â”€ preregistrations/
â”‚   â”‚   â”‚   â”œâ”€â”€ preregistration.entity.ts  visitor_preregistrations table
â”‚   â”‚   â”‚   â”œâ”€â”€ preregistrations.service.ts
â”‚   â”‚   â”‚   â”œâ”€â”€ preregistrations.controller.ts
â”‚   â”‚   â”‚   â””â”€â”€ dto/create-preregistration.dto.ts
â”‚   â”‚   â”œâ”€â”€ instructions/
â”‚   â”‚   â”‚   â”œâ”€â”€ unit-instruction.entity.ts  unit_instructions table (unit PK)
â”‚   â”‚   â”‚   â”œâ”€â”€ instructions.service.ts     PostgreSQL UPSERT ON CONFLICT
â”‚   â”‚   â”‚   â”œâ”€â”€ instructions.controller.ts
â”‚   â”‚   â”‚   â””â”€â”€ dto/save-instruction.dto.ts
â”‚   â”‚   â”œâ”€â”€ gateway/
â”‚   â”‚   â”‚   â”œâ”€â”€ app.gateway.ts         @WebSocketGateway â€” all Socket.IO logic
â”‚   â”‚   â”‚   â””â”€â”€ gateway.module.ts
â”‚   â”‚   â”œâ”€â”€ events/
â”‚   â”‚   â”‚   â”œâ”€â”€ events.service.ts      Redis publisher (fire-and-forget)
â”‚   â”‚   â”‚   â”œâ”€â”€ delivery-subscriber.service.ts  Redis subscriber -> AppGateway
â”‚   â”‚   â”‚   â””â”€â”€ events.module.ts
â”‚   â”‚   â”œâ”€â”€ health/
â”‚   â”‚   â”‚   â””â”€â”€ health.controller.ts   GET /health â€” DataSource ping
â”‚   â”‚   â””â”€â”€ common/
â”‚   â”‚       â””â”€â”€ filters/all-exceptions.filter.ts  Global HTTP exception filter
â”‚   â”œâ”€â”€ Dockerfile                     Multi-stage: builder (tsc) + runner (prod deps only)
â”‚   â”œâ”€â”€ nest-cli.json
â”‚   â”œâ”€â”€ tsconfig.json
â”‚   â””â”€â”€ package.json
â”‚
â”œâ”€â”€ gatepass-security/                 Security guard React app (port 5173)
â”‚   â””â”€â”€ src/
â”‚       â”œâ”€â”€ App.jsx                    Router + login guard
â”‚       â”œâ”€â”€ context/SecurityAppContext.jsx  Global state + Socket.IO lifecycle
â”‚       â”œâ”€â”€ pages/security/
â”‚       â”‚   â”œâ”€â”€ HomePage.jsx           Dashboard: stats, pending approvals, inside-now list
â”‚       â”‚   â”œâ”€â”€ LiveStatusPage.jsx     Filterable full delivery table
â”‚       â”‚   â”œâ”€â”€ CreateDeliveryPage.jsx Delivery log form with pre-reg hints and watchlist check
â”‚       â”‚   â”œâ”€â”€ NotificationsPage.jsx  In-app activity feed
â”‚       â”‚   â””â”€â”€ ChatPage.jsx           Per-thread messaging with residents and officers
â”‚       â”œâ”€â”€ components/security/
â”‚       â”‚   â”œâ”€â”€ SecurityLayout.jsx     App shell with sidebar nav and emergency alert button
â”‚       â”‚   â”œâ”€â”€ SecurityNav.jsx        Navigation links with unread badge counts
â”‚       â”‚   â”œâ”€â”€ SecurityStats.jsx      Stat cards (today / pending / inside / exited)
â”‚       â”‚   â”œâ”€â”€ LoginScreen.jsx        PIN-based login against /users/login/security
â”‚       â”‚   â”œâ”€â”€ GateSetupScreen.jsx    First-run gate + officer name setup (localStorage)
â”‚       â”‚   â””â”€â”€ ChatTick.jsx           Message delivery status tick icon
â”‚       â”œâ”€â”€ components/
â”‚       â”‚   â”œâ”€â”€ StatusBadge.jsx        Pill badge for approval/delivery status
â”‚       â”‚   â””â”€â”€ ConnectionBanner.jsx   Offline/reconnecting banner
â”‚       â”œâ”€â”€ services/
â”‚       â”‚   â”œâ”€â”€ api.js                 fetch wrapper (15 s timeout, AbortController)
â”‚       â”‚   â””â”€â”€ socket.js             createSocket() factory
â”‚       â””â”€â”€ constants/mobileOptions.js  SECURITY_UNITS, GATES, VISITOR_CATEGORIES, DELIVERY_PROFILES
â”‚
â”œâ”€â”€ gatepass-resident/                 Resident React app (port 5174)
â”‚   â””â”€â”€ src/
â”‚       â”œâ”€â”€ App.jsx                    Login guard + unit selection
â”‚       â”œâ”€â”€ context/ResidentAppContext.jsx  Global state + Socket.IO + browser notifications
â”‚       â”œâ”€â”€ pages/resident/
â”‚       â”‚   â”œâ”€â”€ HomePage.jsx           Incoming delivery requests: approve/reject + instructions
â”‚       â”‚   â”œâ”€â”€ VisitorsPage.jsx       Pre-registered visitors: add/remove
â”‚       â”‚   â”œâ”€â”€ NotificationsPage.jsx  In-app notification feed with browser permission toggle
â”‚       â”‚   â””â”€â”€ ChatPage.jsx           Per-thread messaging with security and other residents
â”‚       â”œâ”€â”€ components/resident/
â”‚       â”‚   â”œâ”€â”€ ResidentLayout.jsx     App shell with bottom nav and emergency alert overlay
â”‚       â”‚   â”œâ”€â”€ ResidentNav.jsx        Navigation links with unread badge counts
â”‚       â”‚   â””â”€â”€ LoginScreen.jsx        PIN-based login against /users/login/resident
â”‚       â”œâ”€â”€ components/
â”‚       â”‚   â””â”€â”€ ConnectionBanner.jsx   Offline/reconnecting banner
â”‚       â”œâ”€â”€ services/
â”‚       â”‚   â”œâ”€â”€ api.js                 fetch wrapper (15 s timeout, AbortController)
â”‚       â”‚   â”œâ”€â”€ socket.js             createSocket() factory
â”‚       â”‚   â””â”€â”€ browserNotifications.js  Web Notifications API wrapper
â”‚       â””â”€â”€ constants/mobileOptions.js  RESIDENT_UNITS, VISITOR_CATEGORIES
â”‚
â”œâ”€â”€ db/
â”‚   â”œâ”€â”€ init/01_schema.sql             Schema + seed â€” run automatically on first DB container start
â”‚   â””â”€â”€ seed_users.sql                 Standalone re-seed script (run manually against a running DB)
â”œâ”€â”€ docker-compose.yml
â”œâ”€â”€ .env.example                       Copy to .env and set POSTGRES_PASSWORD before deploying
â””â”€â”€ deploy.ps1                         One-shot PowerShell deploy script
```

## Setup and Deployment

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose v2)
- PowerShell 5.1+ (Windows) or PowerShell 7+ (cross-platform)

### Option A â€” Deploy script (recommended)

```powershell
# First run â€” prompts for DB password, creates .env, builds images, starts all containers
.\deploy.ps1

# Rebuild all images (e.g. after a code change)
.\deploy.ps1 -Build

# Tear down containers then rebuild (DB volume is preserved)
.\deploy.ps1 -Down -Build

# Start and follow all logs
.\deploy.ps1 -Logs
```

### Option B â€” Manual

**1. Create `.env`**

```powershell
Copy-Item .env.example .env
```

Open `.env` and set a strong `POSTGRES_PASSWORD`. Update `DATABASE_URL` to match.

**2. Build and start**

```powershell
docker compose up --build --detach
```

**3. Verify health**

```powershell
docker compose ps
```

All containers should show `healthy` or `running`. The API exposes `GET /health` which is polled by the Docker health-check.

### Stopping

```powershell
docker compose down        # stop containers, keep DB volume
docker compose down -v     # stop + delete DB volume (data loss)
```

### Opening the apps

| App | URL |
|---|---|
| Security dashboard | http://localhost:5173 |
| Resident portal | http://localhost:5174 |
| API health | http://localhost:4001/health |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_USER` | `visitor_admin` | DB username |
| `POSTGRES_PASSWORD` | â€” | DB password. **Must be changed before deploying.** |
| `POSTGRES_DB` | `visitor_management` | DB name |
| `DATABASE_URL` | see `.env.example` | Full PostgreSQL connection URL (must match above) |
| `REDIS_URL` | `redis://redis:6379` | Redis connection URL |
| `DELIVERY_EVENTS_CHANNEL` | `delivery-events` | Redis Pub/Sub channel name |
| `API_PORT` | `4001` | Port the NestJS process listens on inside the container |
| `CORS_ORIGIN` | `http://localhost:5173,http://localhost:5174` | Comma-separated allowed origins |
| `VITE_API_BASE_URL` | `http://localhost:4001` | REST base URL â€” baked into frontend build |
| `VITE_SOCKET_URL` | `http://localhost:4001` | Socket.IO URL â€” baked into frontend build |

## Seed Data

`db/init/01_schema.sql` is executed automatically when the PostgreSQL container is first created. It creates all tables, indexes, and inserts seed users.

Seed users follow a fixed convention:

| Role | User ID format | Example |
|---|---|---|
| Resident | `<flat-lowercase><2-digit-seq>` | flat A101 â†’ `a10101`, `a10102` |
| Security | `security1` â€¦ `security5` | Main Gate â†’ `security1` |

To re-seed an existing database manually:

```powershell
docker exec -i gatepass-db psql -U visitor_admin -d visitor_management < db/seed_users.sql
```

## Workflows

### 1. Visitor entry

```
Security logs visitor at gate
  â””â”€â–º POST /deliveries  { units: ["A101"], visitor_category: "GUEST", ... }
        â””â”€â–º DB: INSERT into deliveries (status: PENDING)
        â””â”€â–º Redis: publish DELIVERY_CREATED
              â””â”€â–º AppGateway â†’ security-dashboard room  (all security clients)
              â””â”€â–º AppGateway â†’ unit:A101 room           (resident sees incoming card)

Resident reviews and decides
  â”œâ”€â–º Approve â†’ POST /deliveries/:id/approve
  â”‚     â””â”€â–º DB: approval_status = APPROVED
  â”‚     â””â”€â–º Redis: DELIVERY_APPROVED â†’ both apps update live
  â””â”€â–º Reject â†’ POST /deliveries/:id/reject
        â””â”€â–º DB: approval_status = REJECTED
        â””â”€â–º Redis: DELIVERY_REJECTED â†’ both apps update live
```

### 2. Parcel delivery

```
Security hands over parcel
  â””â”€â–º POST /deliveries/:id/delivered
        â””â”€â–º DB: delivery_status = DELIVERED
        â””â”€â–º Redis: DELIVERY_COMPLETED â†’ resident sees "Delivered" badge

Resident collects
  â””â”€â–º POST /deliveries/:id/collect
        â””â”€â–º DB: delivery_status = COLLECTED
        â””â”€â–º Redis: DELIVERY_COLLECTED â†’ security sees "Collected" confirmation
```

### 3. Visitor exit

```
Visitor leaves premises
  â””â”€â–º POST /deliveries/:id/exit
        â””â”€â–º DB: delivery_status = EXITED, exited_at = NOW()
        â””â”€â–º Redis: VISITOR_EXITED
              â””â”€â–º Resident receives exit notification (in-app + optional browser push)
              â””â”€â–º Security "Inside Now" count decrements
```

### 4. Real-time chat

```
Security sends message to unit A101
  â””â”€â–º socket emit  chat:send  { toRole: "resident", toUnit: "A101", text: "..." }
        â””â”€â–º AppGateway persists message, broadcasts to:
              â€¢ officer:{officerId} room  (echo back to sender's sessions)
              â€¢ unit:A101 room            (resident receives message)

Resident replies
  â””â”€â–º socket emit  chat:send  { toRole: "security", toUnit: "{officerId}", text: "..." }
        â””â”€â–º AppGateway broadcasts to:
              â€¢ unit:A101 room
              â€¢ officer:{officerId} room

Typing indicators
  â””â”€â–º chat:typing  { toRole, toUnit, isTyping: true|false }
        â””â”€â–º Forwarded to the same rooms as chat:send
```

### 5. Emergency alert

```
Security broadcasts emergency
  â””â”€â–º socket emit  emergency:broadcast  { message: "..." }
        â””â”€â–º AppGateway emits  emergency:alert  to ALL connected clients
              payload: { id, message, timestamp }
```

### 6. Pre-registration

```
Resident pre-registers an expected visitor
  â””â”€â–º POST /preregistrations  { unit, visitor_name, expected_date, ... }

Security opens CreateDelivery for that date
  â””â”€â–º GET /preregistrations?date=YYYY-MM-DD
        â””â”€â–º Matching hints shown per unit; one-click fills the form
```

### 7. Watchlist check

```
Security enters visitor name/phone on CreateDelivery page
  â””â”€â–º GET /watchlist/check?name=John&phone=9999999999
        â””â”€â–º ILIKE name match + exact phone match â†’ warning banner if hits found
```

### 8. Unit instructions

```
Resident sets standing delivery instructions
  â””â”€â–º PUT /instructions  { unit: "A101", instructions: "Leave at door" }

Security opens CreateDelivery, selects units
  â””â”€â–º GET /instructions/multi?units=A101,A102
        â””â”€â–º Per-unit instruction text shown inline before logging visitor
```

## API Reference

### Authentication

| Method | Path | Description |
|---|---|---|
| `POST` | `/users/login/resident` | Authenticate a resident. Rejects security accounts. Body: `{ id, pin }` |
| `POST` | `/users/login/security` | Authenticate a security officer. Rejects resident accounts. Body: `{ id, pin }` |

Both endpoints return the user record (minus `pin`) plus a computed `name` field and update `last_seen_at`.

### Users

| Method | Path | Description |
|---|---|---|
| `GET` | `/users/residents` | All residents (id, name, unit, email, phone), ordered by unit |
| `GET` | `/users/residents/units` | Distinct unit codes that have at least one resident |
| `GET` | `/users/security` | All security officers (id, name, gate), ordered by gate |

### Deliveries

| Method | Path | Description |
|---|---|---|
| `GET` | `/deliveries` | List deliveries. Filters: `unit`, `approval_status`, `delivery_status`, `date` (YYYY-MM-DD), `gate`, `limit` (max 500) |
| `GET` | `/deliveries/recent-visitors` | Distinct visitors from last 30 days (`DISTINCT ON name+phone`), max 20 rows |
| `POST` | `/deliveries` | Create one row per unit in `units[]`. Publishes `DELIVERY_CREATED` |
| `POST` | `/deliveries/:id/approve` | Set `approval_status = APPROVED`. Publishes `DELIVERY_APPROVED` |
| `POST` | `/deliveries/:id/reject` | Set `approval_status = REJECTED`. Publishes `DELIVERY_REJECTED` |
| `POST` | `/deliveries/:id/delivered` | Set `delivery_status = DELIVERED`. Publishes `DELIVERY_COMPLETED` |
| `POST` | `/deliveries/:id/not-delivered` | Set `delivery_status = NOT_DELIVERED`. Publishes `DELIVERY_COMPLETED` |
| `POST` | `/deliveries/:id/collect` | Set `delivery_status = COLLECTED`. Publishes `DELIVERY_COLLECTED` |
| `POST` | `/deliveries/:id/exit` | Set `delivery_status = EXITED`, records `exited_at`. Publishes `VISITOR_EXITED` |

#### `POST /deliveries` request body

```json
{
  "delivery_person_name": "Ravi Kumar",
  "company": "BlueDart",
  "phone_number": "+91-9876543210",
  "units": ["A101", "A102"],
  "gate": "Main Gate",
  "visitor_category": "DELIVERY",
  "vehicle_number": "KA01AB1234",
  "parcel_image": "data:image/png;base64,..."
}
```

`units` must have at least one element. `parcel_image` is a base64 data URL (5 MB body limit). All other fields except `delivery_person_name` and `units` are optional.

#### Status values

| Field | Values |
|---|---|
| `approval_status` | `PENDING` â†’ `APPROVED` or `REJECTED` |
| `delivery_status` | `PENDING` â†’ `DELIVERED` â†’ `COLLECTED` ; or `NOT_DELIVERED` ; or `EXITED` |

#### Visitor categories

`DELIVERY`, `GUEST`, `DAILY_HELP`, `CAB`, `SERVICE`, `VENDOR`, `MEDICAL`, `OTHER`

### Chat

| Method | Path | Description |
|---|---|---|
| `GET` | `/chat/history?threadKey=<key>` | Up to 100 most-recent messages for the thread, oldest-first |
| `GET` | `/chat/threads?unit=A101` | Thread keys that involve this unit |

### Watchlist

| Method | Path | Description |
|---|---|---|
| `GET` | `/watchlist` | All entries, ordered by `created_at DESC` |
| `GET` | `/watchlist/check?name=&phone=` | ILIKE name match + exact phone match, up to 10 results |
| `POST` | `/watchlist` | Add entry. Body: `{ person_name, phone_number?, reason?, added_by? }` |
| `DELETE` | `/watchlist/:id` | Remove entry |

### Instructions

| Method | Path | Description |
|---|---|---|
| `GET` | `/instructions?unit=A101` | Get instructions for one unit |
| `GET` | `/instructions/multi?units=A101,A102` | Instructions for multiple units: `{ instructions: { A101: "...", A102: "..." } }` |
| `PUT` | `/instructions` | Upsert (`ON CONFLICT DO UPDATE`). Body: `{ unit, instructions }` |

### Pre-registrations

| Method | Path | Description |
|---|---|---|
| `GET` | `/preregistrations?unit=A101&date=2026-05-31` | List entries (both params optional) |
| `POST` | `/preregistrations` | Create. Body: `{ unit, visitor_name, expected_date, company?, purpose? }` |
| `DELETE` | `/preregistrations/:id` | Delete |

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Returns `{ status: "ok" }` after a DataSource query ping. Used by Docker health-check |

## Socket.IO Reference

The WebSocket gateway shares the same port as the REST API (`4001`).

### Connecting

```js
import { io } from 'socket.io-client';

// Security client
const socket = io('http://localhost:4001', {
  transports: ['websocket'],
  auth: {
    role: 'security',
    officerId: 'security1',
    officerName: 'Ramesh Kumar',
    gate: 'Main Gate',
  },
});

// Resident client
const socket = io('http://localhost:4001', {
  transports: ['websocket'],
  auth: {
    role: 'resident',
    unit: 'A101',
    residentUserId: 'a10101',
    residentName: 'Arjun Sharma',
  },
});
```

### Rooms

| Room | Who joins | Purpose |
|---|---|---|
| `security-dashboard` | All security clients | Delivery event broadcasts |
| `officer:{officerId}` | The specific security officer | Private chat messages + echo |
| `unit:{UNIT}` | Resident with matching unit | Delivery events + chat messages for that flat |

### Server â†’ Client events

| Event | Sent to | Payload |
|---|---|---|
| `delivery:event` | `security-dashboard` + `unit:{unit}` | `{ type, payload: Delivery, timestamp }` |
| `chat:message` | relevant officer and unit rooms | `{ id, senderRole, senderUnit, senderName, recipientRole, recipientUnit, threadKey, text, attachment, timestamp }` |
| `chat:history` | connecting client only | `ChatMessage[]` â€” pre-loaded on connect |
| `chat:typing` | relevant rooms | `{ senderRole, senderUnit, recipientRole, recipientUnit, threadKey, isTyping }` |
| `chat:status` | relevant rooms | `{ messageId, status, senderRole, senderUnit, recipientRole, recipientUnit, threadKey }` |
| `emergency:alert` | all clients | `{ id, message, timestamp }` |
| `officers:online` | all clients | `{ officerId, officerName, gate }[]` â€” updated on every connect/disconnect |

### Client â†’ Server events

| Event | Description | Key payload fields |
|---|---|---|
| `chat:send` | Send a message | `{ toRole, toUnit, text, attachment? }` â€” attachment: `{ kind: 'image'|'video', dataUrl, name, mimeType }` (max 7 MB) |
| `chat:typing` | Typing indicator | `{ toRole, toUnit, isTyping }` |
| `chat:status` | Acknowledge delivery/seen | `{ messageId, status: 'delivered'|'seen', senderRole, senderUnit, recipientRole, recipientUnit, threadKey }` |
| `emergency:broadcast` | Broadcast emergency (security only) | `{ message }` |

### Thread key format

Thread keys uniquely identify a conversation and are used as the `threadKey` in all chat events.

| Conversation type | Key format | Example |
|---|---|---|
| Security officer â†” Resident unit | `security:{officerId}:{UNIT}` | `security:security1:A101` |
| Security officer â†” Security officer | `sec-sec:{sortedA}:{sortedB}` | `sec-sec:security1:security2` |
| Resident unit â†” Resident unit | `flat:{sortedA}:{sortedB}` | `flat:A101:B201` |

### Delivery event types

| Type | Triggered by |
|---|---|
| `DELIVERY_CREATED` | `POST /deliveries` |
| `DELIVERY_APPROVED` | `POST /deliveries/:id/approve` |
| `DELIVERY_REJECTED` | `POST /deliveries/:id/reject` |
| `DELIVERY_COMPLETED` | `POST /deliveries/:id/delivered` or `/not-delivered` |
| `DELIVERY_COLLECTED` | `POST /deliveries/:id/collect` |
| `VISITOR_EXITED` | `POST /deliveries/:id/exit` |

## Database Schema

Schema is applied from `db/init/01_schema.sql` on first container start. TypeORM runs with `synchronize: false` â€” all schema changes go through SQL files only.

### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | `VARCHAR(40) PK` | e.g. `a10101`, `security1` |
| `role` | `VARCHAR(20)` | `resident` or `security` |
| `first_name` | `VARCHAR(60)` | |
| `last_name` | `VARCHAR(60)` | |
| `email` | `VARCHAR(120)` nullable | Unique |
| `phone` | `VARCHAR(20)` nullable | |
| `unit` | `VARCHAR(20)` nullable | Residents only |
| `gate` | `VARCHAR(50)` nullable | Security officers only |
| `pin` | `VARCHAR(20)` | Plain-text PIN (change to hashed in production) |
| `last_seen_at` | `TIMESTAMP` | Updated on every login |

### `deliveries`

| Column | Type | Notes |
|---|---|---|
| `id` | `SERIAL PK` | |
| `delivery_person_name` | `VARCHAR(120)` | |
| `company` | `VARCHAR(120)` nullable | |
| `phone_number` | `VARCHAR(40)` nullable | |
| `unit` | `VARCHAR(20)` | Stored uppercase |
| `approval_status` | `VARCHAR(20)` | `PENDING` / `APPROVED` / `REJECTED` |
| `delivery_status` | `VARCHAR(20)` | `PENDING` / `DELIVERED` / `NOT_DELIVERED` / `COLLECTED` / `EXITED` |
| `parcel_image` | `TEXT` nullable | Base64 data URL |
| `gate` | `VARCHAR(50)` nullable | |
| `visitor_category` | `VARCHAR(40)` | Default `DELIVERY` |
| `vehicle_number` | `VARCHAR(40)` nullable | |
| `exited_at` | `TIMESTAMP` nullable | Set on `EXITED` |
| `created_at` | `TIMESTAMP` | |
| `updated_at` | `TIMESTAMP` | |

Indexes: `unit`, `approval_status`, `delivery_status`, `created_at DESC`, plus composites on `(unit, created_at DESC)`, `(gate, created_at DESC)`, `(approval_status, created_at DESC)`.

### `chat_messages`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | |
| `thread_key` | `VARCHAR(120)` | See thread key format above |
| `sender_role` | `VARCHAR(20)` | |
| `sender_unit` | `VARCHAR(40)` | Officer ID or flat unit |
| `sender_name` | `VARCHAR(120)` nullable | |
| `recipient_role` | `VARCHAR(20)` | |
| `recipient_unit` | `VARCHAR(40)` nullable | |
| `text` | `TEXT` | |
| `attachment` | `JSONB` nullable | `{ kind, dataUrl, name, mimeType }` |
| `created_at` | `TIMESTAMP` | |

Index on `(thread_key, created_at DESC)`.

### `watchlist`

| Column | Type |
|---|---|
| `id` | `SERIAL PK` |
| `person_name` | `VARCHAR(120)` |
| `phone_number` | `VARCHAR(40)` nullable |
| `reason` | `TEXT` nullable |
| `added_by` | `VARCHAR(80)` nullable |
| `created_at` | `TIMESTAMP` |

### `visitor_preregistrations`

| Column | Type |
|---|---|
| `id` | `SERIAL PK` |
| `unit` | `VARCHAR(20)` |
| `visitor_name` | `VARCHAR(120)` |
| `company` | `VARCHAR(120)` nullable |
| `purpose` | `VARCHAR(200)` nullable |
| `expected_date` | `DATE` |
| `created_at` | `TIMESTAMP` |

### `unit_instructions`

| Column | Type |
|---|---|
| `unit` | `VARCHAR(20) PK` |
| `instructions` | `TEXT` |
| `updated_at` | `TIMESTAMP` |

## Frontend Details

### Security app (gatepass-security)

**Login** â€” PIN-based via `POST /users/login/security`. Accepts security accounts only.

**Gate setup** â€” after login, a setup screen persists gate name and officer name from the user record to `localStorage`. Clearing localStorage resets the setup.

**Units and gates** â€” defined in `constants/mobileOptions.js`:
- 20 flats: A101â€“A110, B201â€“B210
- 5 gates: Main Gate, Gate A, Gate B, Back Gate, Service Gate

**Visitor categories** â€” `DELIVERY`, `GUEST`, `DAILY_HELP`, `CAB`, `SERVICE`, `VENDOR`, `MEDICAL`, `OTHER`

**HomePage stat cards** â€” Today's visitors / Pending approval / Currently inside / Exited today

**CreateDelivery smart features**:
- Multi-flat selection (one delivery record created per flat)
- Recent visitors autofill (last 30 days)
- Watchlist check on name/phone input â€” warning banner if matches found
- Pre-registration hints for selected flats on the current date
- Per-unit delivery instructions shown inline
- Optional parcel image capture (stored as base64, max 5 MB body)
- Delivery profile presets for quick-fill

**LiveStatusPage** â€” full table with tab filter (All / Inside / Pending), date, search, unit, and category filters, plus inline approve/reject and status action buttons.

**Chat** â€” per-thread messaging. Each thread is identified by a `threadKey`. Security can start conversations with any flat or with another officer. Messages are persisted in `chat_messages` and pre-loaded on socket connect.

**Emergency Alert** â€” compact icon button in the mobile header (full-width in sidebar). Opens a modal rendered via `createPortal` to escape CSS stacking contexts. Broadcasts to all connected clients via `emergency:broadcast`.

### Resident app (gatepass-resident)

**Login** â€” PIN-based via `POST /users/login/resident`. Accepts resident accounts only.

**Unit selection** â€” after login the resident's unit is read from the user record and persisted to `localStorage`.

**HomePage** â€” incoming delivery requests for the resident's unit with approve/reject buttons and an inline delivery instructions editor.

**VisitorsPage** â€” pre-registered visitor list with add/remove.

**Browser notifications** â€” residents can grant Web Notification permission. `browserNotifications.js` fires push notifications for `DELIVERY_CREATED`, `DELIVERY_APPROVED`, `DELIVERY_REJECTED`, and `VISITOR_EXITED` events.

**Chat** â€” same thread model as the security app. Thread history pre-loaded on socket connect. Supports attachments (photo/video up to 7 MB).

**Emergency alert overlay** â€” full-screen modal rendered via `createPortal` on `emergency:alert` events. Dismissible by the resident.

## Useful Commands

```powershell
# Container status
docker compose ps

# All logs, streaming
docker compose logs -f

# Single service logs
docker compose logs -f gatepass-api

# Restart one service without rebuilding
docker compose restart gatepass-api

# Rebuild and restart one service
docker compose up --build --detach gatepass-api

# psql shell
docker exec -it gatepass-db psql -U visitor_admin -d visitor_management

# Re-seed users (against a running DB)
docker exec -i gatepass-db psql -U visitor_admin -d visitor_management < db/seed_users.sql

# Stop everything
docker compose down
```
