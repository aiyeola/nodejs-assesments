# Creator Card Microservice API

A backend microservice that manages shareable **Creator Cards** — public profile cards
displaying links and service rates. Built on the Resilience 17 Node.js project template
(Express + MongoDB) following its layered architecture: `endpoint → service → repository → model`.

> Implementation notes for the underlying framework live in [CODEBASE_GUIDE.md](./CODEBASE_GUIDE.md).

## Tech stack

- Node.js (vanilla JavaScript) + Express.js
- MongoDB via Mongoose (using the template's `@app-core/mongoose` + `@app-core/repository-factory`)
- Input validation via the template's VSL validator (`@app-core/validator`)

## Endpoints

Base URL: the deployed root (no versioning, no auth). e.g. `https://your-app.onrender.com`

| Method   | Path                   | Description                              |
| -------- | ---------------------- | ---------------------------------------- |
| `POST`   | `/creator-cards`       | Create a card                            |
| `GET`    | `/creator-cards/:slug` | Public retrieval with access control     |
| `DELETE` | `/creator-cards/:slug` | Soft-delete a card (owner-verified)      |

All responses are wrapped by the framework as `{ status, message, data }` on success and
`{ status: "error", message, errors, data: { code } }` on failure. The assessment business
code (e.g. `NF01`) is returned in both `data.code` and `errors[].code`.

### 1. `POST /creator-cards`

Creates a card. Returns **HTTP 200** with the created card (the card identifier is returned
as `id`, never `_id`). The `access_code` **is** included in the create response.

- `slug` is auto-generated from the `title` when omitted.
- Slug uniqueness is enforced — a user-supplied duplicate slug returns **`SL02`**.
- `access_code` is required when `access_type` is `private` (**`AC01`**) and must **not**
  be present when the card is `public` (**`AC05`**).

### 2. `GET /creator-cards/:slug`

Public retrieval. Pass `access_code` as a query parameter for private cards
(`/creator-cards/:slug?access_code=abc123`). Rules are applied in order:

1. Card missing → **404 `NF01`**
2. Card is a `draft` → **404 `NF02`** (distinct from "not found")
3. Private card, no `access_code` → **403 `AC03`**
4. Private card, wrong `access_code` → **403 `AC04`**
5. Success → **200** (the `access_code` field is never exposed)

### 3. `DELETE /creator-cards/:slug`

Soft-deletes a card. Body must contain `creator_reference` (exactly 20 characters). The
card is matched on **both** slug and `creator_reference`, so a non-owner gets **404 `NF01`**.
Returns **HTTP 200** with the card including a `deleted` timestamp. Deleted cards can no
longer be retrieved.

## Data model

| Field               | Type           | Rules                                                                       |
| ------------------- | -------------- | --------------------------------------------------------------------------- |
| `id`                | ULID           | Serialized from Mongo `_id`                                                  |
| `title`             | string         | 3–100 chars (required)                                                       |
| `description`       | string         | max 500 chars                                                               |
| `slug`              | string         | 5–50 chars, `[A-Za-z0-9_-]`, unique, auto-generated if omitted              |
| `creator_reference` | string         | exactly 20 chars (required)                                                  |
| `links[]`           | array          | `{ title: 1–100, url: max 200, starts with http/https }`                    |
| `service_rates`     | object         | `{ currency: NGN\|USD\|GBP\|GHS, rates[]: non-empty }`                       |
| `service_rates.rates[]` | array      | `{ name: 3–100, description: max 250, amount: positive integer (minor units) }` |
| `status`            | enum           | `draft` \| `published` (required)                                            |
| `access_type`       | enum           | `public` (default) \| `private`                                              |
| `access_code`       | string         | exactly 6 alphanumeric chars (required when `private`)                       |
| `created`           | number         | Unix epoch ms                                                                |
| `updated`           | number         | Unix epoch ms                                                                |
| `deleted`           | number \| null | `null` unless soft-deleted                                                   |

## Error codes

| Code   | HTTP | Meaning                                  |
| ------ | ---- | ---------------------------------------- |
| `SL02` | 400  | Slug already taken                       |
| `AC01` | 400  | `access_code` required for private cards |
| `AC05` | 400  | `access_code` not allowed on public cards|
| `NF01` | 404  | Card does not exist                      |
| `NF02` | 404  | Card exists but is a draft               |
| `AC03` | 403  | Access code required                     |
| `AC04` | 403  | Invalid access code                      |

Generic field-level validation failures (bad lengths, types, enums, malformed URL,
non-integer amount, etc.) return **HTTP 400**.

## Project layout (the parts added for this assessment)

```
endpoints/creator-cards/   create.js · get.js · delete.js   # routing
services/creator-cards/    create-card.js · get-card.js · delete-card.js · helpers.js  # business logic
models/creator-card.js     Mongoose model (ULID id, paranoid soft-delete)
repository/creator-card/    repository-factory wrapper
messages/creator-card.js    human-readable messages
```

## Running locally

```bash
npm install
cp .env.example .env      # set MONGODB_URI and PORT
npm run dev               # or: node app.js
```

```bash
curl -X POST http://localhost:3000/creator-cards \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "My Creator Page",
    "creator_reference": "abcdefghij0123456789",
    "links": [{ "title": "Website", "url": "https://example.com" }],
    "service_rates": { "currency": "USD", "rates": [{ "name": "Basic", "amount": 5000 }] },
    "status": "published"
  }'
```

## Deployment

Deployed on Render/Heroku. The web process runs `node bootstrap.js` (see `Procfile`).
Required environment variables:

- `MONGODB_URI` — MongoDB connection string (e.g. MongoDB Atlas)
- `PORT` — provided by the platform

No authentication and no URL versioning are required by the spec.
