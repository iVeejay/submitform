# Portfolio Contact Form Worker (Cloudflare Workers + D1)

This project stores messages from your portfolio contact form in Cloudflare D1.

## What this Worker provides

- `POST /api/messages` for public form submissions.
- `GET /api/messages` for fetching stored messages (protected by admin token).
- `GET /admin` for a simple browser UI to view messages (protected by admin token).
- D1 schema for a professional message table with timestamps and useful indexes.

## Message schema (D1)

Table: `contact_messages`

- `id` integer primary key
- `name` text (required)
- `email` text (required)
- `subject` text (optional)
- `message` text (required)
- `ip` text (optional, from `CF-Connecting-IP`)
- `user_agent` text (optional)
- `created_at` text default `CURRENT_TIMESTAMP`

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a D1 database (if needed):
```bash
npx wrangler d1 create submitform-db
```

3. Put the returned `database_id` into `wrangler.json` under `d1_databases[0].database_id`.

4. Apply migrations to remote D1:
```bash
npx wrangler d1 migrations apply DB --remote
```

5. Set secrets/vars:
```bash
npx wrangler secret put ADMIN_TOKEN
```

Optional CORS restriction (recommended):

```bash
npx wrangler vars set ALLOWED_ORIGIN
```

Set `ALLOWED_ORIGIN` to your website origin (example: `https://yourdomain.com`).
If not set, CORS defaults to `*`.

6. Deploy:
```bash
npx wrangler deploy
```

## API usage

### Public submit endpoint

`POST /api/messages`

Request body:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Project inquiry",
  "message": "Hello, I want to work with you."
}
```

Notes:
- `subject` is optional.
- `Content-Type` must be `application/json`.

### Protected list endpoint

`GET /api/messages?limit=50&offset=0`

Provide admin token in one of these:
- `Authorization: Bearer <ADMIN_TOKEN>`
- `X-Admin-Token: <ADMIN_TOKEN>`
- query string: `?token=<ADMIN_TOKEN>` (easy for browser testing, less secure than headers)

### Protected admin page

`GET /admin?token=<ADMIN_TOKEN>`

Shows a clean table of latest messages.

## Your frontend form example

```js
await fetch("https://<your-worker-domain>/api/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name,
    email,
    subject, // optional
    message
  })
});
```

## Professional UI for your database

You get two good viewing options:

1. Cloudflare Dashboard D1 UI:
- Go to Cloudflare Dashboard -> Workers & Pages -> D1 -> your database.
- Use the **Data** tab for table browsing.
- Use the **Console** tab for SQL queries.

2. Built-in Worker admin page:
- `https://<your-worker-domain>/admin?token=<ADMIN_TOKEN>`

For your future PC app, call `GET /api/messages` with the admin token and render the response in your app UI.
