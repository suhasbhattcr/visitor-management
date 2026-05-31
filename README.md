# GatePass

Real-time visitor and parcel management system for apartment complexes. Security guards and residents use separate apps that stay in sync through a NestJS API with Socket.IO and Redis Pub/Sub — no polling, all push.

## Stack

| Layer | Technology |
|---|---|
| Security Frontend | React 18, Vite, Tailwind CSS, React Router, Socket.IO Client |
| Resident Frontend | React 18, Vite, Tailwind CSS, React Router, Socket.IO Client |
| API Gateway | NestJS 10, TypeORM 0.3, Socket.IO 4, class-validator |
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
3. `DeliverySubscriberService` (a NestJS service with an in-process Redis subscriber) receives the event, deduplicates it by `type:id`, and calls `AppGateway.broadcastDeliveryEvent()` directly — no network hop, no extra container.
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
├── gatepass-api/                      NestJS backend
│   ├── src/
│   │   ├── main.ts                    Bootstrap: CORS, pipes, body limit, graceful shutdown
│   │   ├── app.module.ts              Root module: TypeORM config, feature module imports
│   │   ├── deliveries/
│   │   │   ├── delivery.entity.ts     TypeORM entity — deliveries table
│   │   │   ├── deliveries.service.ts  Business logic, publishes Redis events
│   │   │   ├── deliveries.controller.ts
│   │   │   └── dto/
│   │   │       ├── create-delivery.dto.ts
│   │   │       └── query-delivery.dto.ts
│   │   ├── watchlist/
│   │   │   ├── watchlist.entity.ts    TypeORM entity — watchlist table
│   │   │   ├── watchlist.service.ts   LIKE/exact-match search
│   │   │   ├── watchlist.controller.ts
│   │   │   └── dto/create-watchlist.dto.ts
│   │   ├── preregistrations/
│   │   │   ├── preregistration.entity.ts  visitor_preregistrations table
│   │   │   ├── preregistrations.service.ts
│   │   │   ├── preregistrations.controller.ts
│   │   │   └── dto/create-preregistration.dto.ts
│   │   ├── instructions/
│   │   │   ├── unit-instruction.entity.ts  unit_instructions table (unit PK)
│   │   │   ├── instructions.service.ts     PostgreSQL UPSERT ON CONFLICT
│   │   │   ├── instructions.controller.ts
│   │   │   └── dto/save-instruction.dto.ts
│   │   ├── gateway/
│   │   │   ├── app.gateway.ts         @WebSocketGateway — all Socket.IO logic
│   │   │   └── gateway.module.ts
│   │   ├── events/
│   │   │   ├── events.service.ts      Redis publisher (fire-and-forget)
│   │   │   ├── delivery-subscriber.service.ts  Redis subscriber → AppGateway
│   │   │   └── events.module.ts
│   │   ├── health/
│   │   │   └── health.controller.ts   GET /health — DataSource ping
│   │   └── common/
│   │       └── filters/all-exceptions.filter.ts  Global HTTP exception filter
│   ├── Dockerfile                     Multi-stage: builder (tsc) + runner (prod deps only)
│   ├── nest-cli.json
│   ├── tsconfig.json
│   └── package.json                   name: gatepass-api
│
├── gatepass-security/                 Security guard React app (port 5173)
│   └── src/
│       ├── App.jsx                    Router + GateSetupScreen guard
│       ├── context/SecurityAppContext.jsx  Single global state + Socket.IO lifecycle
│       ├── pages/security/
│       │   ├── HomePage.jsx           Dashboard: stats, pending approvals, inside-now list
│       │   ├── LiveStatusPage.jsx     Filterable full delivery table (unit, date, category, tab)
│       │   ├── CreateDeliveryPage.jsx Form: multi-unit, visitor category, parcel image, pre-reg hints
│       │   ├── NotificationsPage.jsx  In-app notification feed
│       │   └── ChatPage.jsx           Per-thread messaging with resident units
│       ├── components/security/
│       │   ├── SecurityLayout.jsx     App shell with sidebar nav
│       │   ├── SecurityNav.jsx        Navigation links with badge counts
│       │   ├── SecurityStats.jsx      Stat cards (today, pending, inside, exited)
│       │   ├── GateSetupScreen.jsx    First-run gate + officer name setup (localStorage)
│       │   └── ChatTick.jsx           Message status tick icon
│       ├── components/
│       │   ├── StatusBadge.jsx        Pill badge for approval/delivery status
│       │   └── ConnectionBanner.jsx   Offline/reconnecting overlay
│       ├── services/
│       │   ├── api.js                 fetch wrapper (15s timeout, AbortController)
│       │   └── socket.js             createSocket() factory
│       └── constants/mobileOptions.js  SECURITY_UNITS, GATES, VISITOR_CATEGORIES, DELIVERY_PROFILES
│
├── gatepass-resident/                 Resident React app (port 5174)
│   └── src/
│       ├── App.jsx                    Unit selection (URL param > localStorage > picker)
│       ├── context/ResidentAppContext.jsx  Global state + Socket.IO + browser notifications
│       ├── pages/resident/
│       │   ├── HomePage.jsx           Incoming delivery requests with approve/reject + instructions
│       │   ├── VisitorsPage.jsx       Full delivery history with filters and collect action
│       │   ├── NotificationsPage.jsx  In-app notification feed with browser notification toggle
│       │   └── ChatPage.jsx           Per-thread messaging with security / other residents
│       ├── components/resident/
│       │   ├── ResidentLayout.jsx     App shell with bottom nav
│       │   └── ResidentNav.jsx        Navigation links with unread badge
│       ├── components/
│       │   └── ConnectionBanner.jsx   Offline/reconnecting overlay
│       ├── services/
│       │   ├── api.js                 fetch wrapper (15s timeout, AbortController)
│       │   ├── socket.js             createSocket() factory
│       │   └── browserNotifications.js  Web Notifications API wrapper
│       └── constants/mobileOptions.js  RESIDENT_UNITS, VISITOR_CATEGORIES
│
├── db/
│   └── init/01_schema.sql             Schema run once on first DB container start
├── docker-compose.yml
├── .env.example
└── deploy.ps1                         One-shot PowerShell deploy script
```

## Setup and Deployment

### Option A — Deploy script (recommended)

```powershell
# First run — creates .env with prompts, builds all images, starts containers, waits for health
.\deploy.ps1

# Force rebuild of all images
.\deploy.ps1 -Build

# Full teardown then rebuild (wipes containers, keeps DB volume)
.\deploy.ps1 -Down -Build

# Start and follow all logs
.\deploy.ps1 -Logs
```

The script checks for Docker, creates `.env` from `.env.example` on first run (prompting for `POSTGRES_PASSWORD`), runs `docker compose up --detach`, and polls `GET /health` for up to 60 seconds.

### Option B — Manual

**1. Create `.env`**

```powershell
Copy-Item .env.example .env
```

Edit `.env` — at minimum change `POSTGRES_PASSWORD` from the default.

**2. Build and start**

```powershell
docker compose up --build --detach
```

**3. Verify health**

```powershell
docker compose ps
```

All containers should show `healthy` or `running`. The `gatepass-api` container exposes a Docker health-check on `GET /health`.

### Stopping

```powershell
docker compose down          # stop containers, keep DB volume
docker compose down -v       # stop + delete DB volume (data loss)
```

### Opening the apps

| App | URL |
|---|---|
| Security dashboard | http://localhost:5173 |
| Resident portal | http://localhost:5174?unit=A101 |
| API health | http://localhost:4001/health |

The resident app requires a unit identifier. Pass it as `?unit=A101` in the URL, or select it from the picker on first load (persisted in `localStorage`).

## Environment Variables

| Variable | Default in `.env.example` | Description |
|---|---|---|
| `POSTGRES_USER` | `visitor_admin` | DB username |
| `POSTGRES_PASSWORD` | `visitor_pass` | DB password — **change this** |
| `POSTGRES_DB` | `visitor_management` | DB name |
| `DATABASE_URL` | see file | Full TypeORM connection URL |
| `REDIS_URL` | `redis://redis:6379` | Redis connection URL |
| `DELIVERY_EVENTS_CHANNEL` | `delivery-events` | Redis Pub/Sub channel |
| `API_PORT` | `4001` | Port the NestJS process listens on |
| `CORS_ORIGIN` | `http://localhost:5173,http://localhost:5174` | Comma-separated allowed origins |
| `VITE_API_BASE_URL` | `http://localhost:4001` | REST base URL (baked into frontend at build time) |
| `VITE_SOCKET_URL` | `http://localhost:4001` | Socket.IO URL (baked into frontend at build time) |

## Workflows

### 1. Visitor entry

```
Security logs visitor at gate
  └─► POST /deliveries  {units: ["A101"], visitor_category: "GUEST", ...}
        └─► DB: INSERT into deliveries (status: PENDING/PENDING)
        └─► Redis: publish DELIVERY_CREATED
              └─► AppGateway → security-dashboard room ← security sees new row appear
              └─► AppGateway → unit:A101 room ← resident sees incoming request card

Resident reviews and decides
  ├─► Approve → POST /deliveries/:id/approve
  │     └─► DB: approval_status = APPROVED
  │     └─► Redis: publish DELIVERY_APPROVED
  │           └─► Security table updates live (row turns green)
  │           └─► Resident card confirms approved
  └─► Reject → POST /deliveries/:id/reject
        └─► DB: approval_status = REJECTED
        └─► Redis: publish DELIVERY_REJECTED
              └─► Security table updates live (row turns red)
```

### 2. Parcel delivery

```
Security hands over parcel
  └─► POST /deliveries/:id/delivered
        └─► DB: delivery_status = DELIVERED
        └─► Redis: publish DELIVERY_COMPLETED
              └─► Resident sees "Delivered" badge
              └─► Resident can now POST /deliveries/:id/collect

Resident collects
  └─► POST /deliveries/:id/collect
        └─► DB: delivery_status = COLLECTED
        └─► Redis: publish DELIVERY_COLLECTED
              └─► Security sees "Collected" confirmation
```

### 3. Parcel not delivered / unable to deliver

```
Security cannot hand over
  └─► POST /deliveries/:id/not-delivered
        └─► DB: delivery_status = NOT_DELIVERED
        └─► Redis: publish DELIVERY_COMPLETED
              └─► Both apps show "Not Delivered" status
```

### 4. Visitor exit

```
Visitor leaves premises
  └─► POST /deliveries/:id/exit
        └─► DB: delivery_status = EXITED, exited_at = NOW()
        └─► Redis: publish VISITOR_EXITED
              └─► Resident receives exit notification (in-app + optional browser push)
              └─► Security "Inside Now" count decrements
```

### 5. Real-time chat

```
Security sends message to unit A101
  └─► Socket emit  chat:send  { toRole: "resident", toUnit: "A101", text: "..." }
        └─► AppGateway broadcasts to:
              • security-dashboard room (echo to all security clients)
              • unit:A101 room (resident receives message)

Resident replies
  └─► Socket emit  chat:send  { toRole: "security", text: "..." }
        └─► AppGateway broadcasts to:
              • security-dashboard room
              • unit:<senderUnit> room

Typing indicators
  └─► chat:typing  { toRole, toUnit, isTyping: true/false }
        └─► Forwarded to the same rooms, cleared automatically on client timeout
```

### 6. Emergency alert

```
Security broadcasts emergency
  └─► Socket emit  emergency:broadcast  { message: "..." }
        └─► AppGateway emits  emergency:alert  to ALL connected clients
              payload: { id, message, timestamp }
```

### 7. Pre-registration

```
Resident pre-registers an expected visitor
  └─► POST /preregistrations  { unit, visitor_name, expected_date, ... }

Security opens CreateDelivery for that date
  └─► GET /preregistrations?date=YYYY-MM-DD
        └─► CreateDeliveryPage shows matching pre-registration hints per unit
        └─► Security can one-click fill form from pre-registered visitor data
```

### 8. Watchlist check

```
Security enters visitor name/phone on CreateDelivery page
  └─► GET /watchlist/check?name=John&phone=9999999999
        └─► Returns partial-name LIKE match + exact phone match
        └─► CreateDeliveryPage shows a warning banner if any matches found
        └─► Security can proceed or deny entry manually
```

### 9. Unit instructions

```
Resident sets standing delivery instructions
  └─► PUT /instructions  { unit: "A101", instructions: "Leave at door" }

Security opens CreateDelivery, selects units
  └─► GET /instructions/multi?units=A101,A102
        └─► Per-unit instruction text displayed inline
        └─► Security reads instructions before logging visitor
```

## API Reference

### Deliveries

| Method | Path | Description |
|---|---|---|
| `GET` | `/deliveries` | List deliveries. Supports filters: `unit`, `approval_status`, `delivery_status`, `date` (YYYY-MM-DD), `gate`, `limit` (max 500) |
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
  "vehicle_number": "MH12AB1234",
  "parcel_image": "data:image/png;base64,..."
}
```

`units` must have at least one element. All other fields except `delivery_person_name`, `company`, `phone_number`, and `units` are optional. `parcel_image` is stored as a base64 data URL string (5 MB body limit enforced).

#### Delivery status values

| Field | Values |
|---|---|
| `approval_status` | `PENDING` → `APPROVED` or `REJECTED` |
| `delivery_status` | `PENDING` → `DELIVERED` → `COLLECTED` ; or `NOT_DELIVERED` ; or `EXITED` |

#### Visitor categories

`DELIVERY`, `GUEST`, `DAILY_HELP`, `CAB`, `SERVICE`, `VENDOR`, `MEDICAL`, `OTHER`

### Watchlist

| Method | Path | Description |
|---|---|---|
| `GET` | `/watchlist` | All entries, ordered by `created_at DESC` |
| `GET` | `/watchlist/check?name=&phone=` | Partial name match (`ILIKE`) + exact phone match, returns up to 10 |
| `POST` | `/watchlist` | Add entry (`person_name` required; `phone_number`, `reason`, `added_by` optional) |
| `DELETE` | `/watchlist/:id` | Remove entry |

### Instructions

| Method | Path | Description |
|---|---|---|
| `GET` | `/instructions?unit=A101` | Get instructions for one unit |
| `GET` | `/instructions/multi?units=A101,A102` | Get instructions for multiple units, returns `{ instructions: { A101: "...", A102: "..." } }` |
| `PUT` | `/instructions` | Create or update (`ON CONFLICT DO UPDATE`). Body: `{ unit, instructions }` |

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

The WebSocket gateway runs on the same port and host as the REST API (`4001`).

### Connecting

```js
import { io } from 'socket.io-client';

// Security client
const socket = io('http://localhost:4001', {
  transports: ['websocket'],
  auth: { role: 'security' },
});

// Resident client
const socket = io('http://localhost:4001', {
  transports: ['websocket'],
  auth: { role: 'resident', unit: 'A101' },
});
```

### Rooms

| Room | Who joins | How |
|---|---|---|
| `security-dashboard` | All security clients | Automatic on connect when `role === 'security'` |
| `unit:A101` | Resident with `unit: 'A101'` | Automatic on connect when `role === 'resident'` |

### Server → Client events

| Event | Sent to | Payload |
|---|---|---|
| `delivery:event` | `security-dashboard` + `unit:<unit>` | `{ type: string, payload: Delivery, timestamp: string }` |
| `chat:message` | relevant rooms | `{ id, senderRole, senderUnit, recipientRole, recipientUnit, threadKey, text, attachment, timestamp }` |
| `chat:typing` | relevant rooms | `{ senderRole, senderUnit, recipientRole, recipientUnit, threadKey, isTyping }` |
| `chat:status` | `security-dashboard` + relevant unit rooms | `{ messageId, status, senderRole, senderUnit, recipientRole, recipientUnit, threadKey }` |
| `emergency:alert` | all clients | `{ id, message, timestamp }` |

### Client → Server events

| Event | Description | Key payload fields |
|---|---|---|
| `chat:send` | Send a message | `{ toRole, toUnit, text, attachment? }` — `attachment` has `{ kind: 'image'|'video', dataUrl, name, mimeType }` (max 7 MB) |
| `chat:typing` | Typing indicator | `{ toRole, toUnit, isTyping }` |
| `chat:status` | Acknowledge message | `{ messageId, status: 'delivered'|'seen', senderRole, senderUnit, recipientRole, recipientUnit, threadKey }` |
| `emergency:broadcast` | Security-only emergency alert | `{ message }` |

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

Schema is applied automatically from `db/init/01_schema.sql` on first container start. TypeORM runs with `synchronize: false` — schema changes go through SQL only.

### `deliveries`

| Column | Type | Notes |
|---|---|---|
| `id` | `SERIAL PK` | |
| `delivery_person_name` | `VARCHAR(120)` | |
| `company` | `VARCHAR(120)` | |
| `phone_number` | `VARCHAR(40)` | |
| `unit` | `VARCHAR(20)` | Stored as uppercase |
| `approval_status` | `VARCHAR(20)` | `PENDING` / `APPROVED` / `REJECTED` (CHECK constraint) |
| `delivery_status` | `VARCHAR(20)` | `PENDING` / `DELIVERED` / `NOT_DELIVERED` / `COLLECTED` / `EXITED` (CHECK constraint) |
| `parcel_image` | `TEXT` nullable | Base64 data URL |
| `gate` | `VARCHAR(50)` nullable | |
| `visitor_category` | `VARCHAR(40)` | Default `DELIVERY` |
| `vehicle_number` | `VARCHAR(40)` nullable | |
| `exited_at` | `TIMESTAMP` nullable | Set on exit |
| `created_at` | `TIMESTAMP` | |
| `updated_at` | `TIMESTAMP` | |

Indexes: `unit`, `approval_status`, `delivery_status`, `created_at DESC`, plus composites on `(unit, created_at DESC)`, `(gate, created_at DESC)`, `(approval_status, created_at DESC)`.

### `watchlist`

| Column | Type |
|---|---|
| `id` | `SERIAL PK` |
| `person_name` | `VARCHAR(120)` |
| `phone_number` | `VARCHAR(40)` nullable |
| `reason` | `TEXT` nullable |
| `added_by` | `VARCHAR(80)` nullable |
| `created_at` | `TIMESTAMP` |

Indexes on `LOWER(person_name)` and `phone_number`.

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

**Gate setup** — on first load, a setup screen persists `gate` name and `officer_name` to `localStorage`. All subsequent deliveries are tagged with the gate. Clearing localStorage resets this.

**Units and gates** — defined in `constants/mobileOptions.js`:
- 20 units: A101–A110, B201–B210
- 5 gates: Main Gate, Gate A, Gate B, Back Gate, Service Gate

**Visitor categories** — `DELIVERY`, `GUEST`, `DAILY_HELP`, `CAB`, `SERVICE`, `VENDOR`, `MEDICAL`, `OTHER`

**HomePage stats cards**:
- Today's visitors / Pending approval / Currently inside / Exited today

**CreateDelivery smart features**:
- Multi-unit selection (one delivery record per unit)
- Recent visitors autofill (last 30 days)
- Watchlist check on name/phone input — shows warning banner
- Pre-registration hints for selected units + date
- Unit instructions displayed per unit
- Optional parcel image via file picker (stored as base64)
- Delivery profile presets (quick fill for common couriers)

**LiveStatusPage** — full table with:
- Tab filter: All / Inside / Pending
- Date filter (defaults to today)
- Search by name/company/phone/unit
- Unit filter and category filter
- Inline approve/reject and status action buttons

### Resident app (gatepass-resident)

**Unit selection** — priority: `?unit=` URL param > `localStorage` > picker screen. The picker opens a new tab with the selected unit in the URL.

**HomePage** — shows incoming delivery requests for the resident's unit with:
- Approve / Reject buttons on pending items
- Inline instructions editor with preset quick-replies
- Status timeline display

**VisitorsPage** — full history with collect action for delivered items.

**Browser notifications** — residents can grant Web Notification permission. `browserNotifications.js` wraps the Notifications API and fires push notifications for `DELIVERY_CREATED`, `DELIVERY_APPROVED`, `DELIVERY_REJECTED`, and `VISITOR_EXITED` events.

**Chat thread keys**:
- Security ↔ Resident: `security:A101`
- Resident ↔ Resident: `flat:A101:B201` (units sorted alphabetically)

## Useful Commands

```powershell
# Container status
docker compose ps

# All logs, streaming
docker compose logs -f

# Single service logs
docker compose logs -f gatepass-api

# Restart one service (no rebuild)
docker compose restart gatepass-api

# Rebuild and restart one service
docker compose up --build --detach gatepass-api

# psql shell
docker exec -it gatepass-db psql -U visitor_admin -d visitor_management

# Stop everything
docker compose down
```