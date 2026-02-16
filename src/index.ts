import { renderHtml } from "./renderHtml";

type WorkerEnv = {
	DB: D1Database;
	ADMIN_TOKEN?: string;
	ALLOWED_ORIGIN?: string;
};

type MessagePayload = {
	name: string;
	email: string;
	subject?: string;
	message: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default {
	async fetch(request: Request, env: WorkerEnv): Promise<Response> {
		const url = new URL(request.url);
		const corsHeaders = buildCorsHeaders(request, env);

		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: corsHeaders });
		}

		if (url.pathname === "/api/messages" && request.method === "POST") {
			return handleCreateMessage(request, env, corsHeaders);
		}

		if (url.pathname === "/api/messages" && request.method === "GET") {
			if (!isAuthorized(request, env.ADMIN_TOKEN)) {
				return json(
					{ error: "Unauthorized" },
					401,
					withJsonHeaders(corsHeaders),
				);
			}

			const limit = clampNumber(url.searchParams.get("limit"), 50, 1, 200);
			const offset = clampNumber(url.searchParams.get("offset"), 0, 0, 10000);

			const stmt = env.DB.prepare(
				`SELECT id, name, email, subject, message, ip, user_agent, created_at
				 FROM contact_messages
				 ORDER BY id DESC
				 LIMIT ? OFFSET ?`,
			).bind(limit, offset);
			const { results } = await stmt.all();

			return json(
				{
					results,
					limit,
					offset,
				},
				200,
				withJsonHeaders(corsHeaders),
			);
		}

		if (url.pathname === "/admin" && request.method === "GET") {
			if (!isAuthorized(request, env.ADMIN_TOKEN)) {
				return new Response("Unauthorized", { status: 401 });
			}

			const stmt = env.DB.prepare(
				`SELECT id, name, email, subject, message, created_at
				 FROM contact_messages
				 ORDER BY id DESC
				 LIMIT 200`,
			);
			const { results } = await stmt.all();

			return new Response(renderHtml(results), {
				headers: { "content-type": "text/html; charset=utf-8" },
			});
		}

		return json(
			{
				error: "Not found",
				available_routes: [
					"POST /api/messages",
					"GET /api/messages (requires ADMIN_TOKEN)",
					"GET /admin (requires ADMIN_TOKEN)",
				],
			},
			404,
			withJsonHeaders(corsHeaders),
		);
	},
} satisfies ExportedHandler<WorkerEnv>;

async function handleCreateMessage(
	request: Request,
	env: WorkerEnv,
	corsHeaders: Headers,
): Promise<Response> {
	const contentType = request.headers.get("content-type") || "";
	if (!contentType.includes("application/json")) {
		return json(
			{ error: "Content-Type must be application/json" },
			415,
			withJsonHeaders(corsHeaders),
		);
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: "Invalid JSON body" }, 400, withJsonHeaders(corsHeaders));
	}

	const payload = validatePayload(body);
	if ("error" in payload) {
		return json({ error: payload.error }, 400, withJsonHeaders(corsHeaders));
	}

	const ip = request.headers.get("CF-Connecting-IP");
	const userAgent = request.headers.get("User-Agent");

	const stmt = env.DB.prepare(
		`INSERT INTO contact_messages (name, email, subject, message, ip, user_agent)
		 VALUES (?, ?, ?, ?, ?, ?)`,
	).bind(
		payload.name,
		payload.email,
		payload.subject || null,
		payload.message,
		ip || null,
		userAgent || null,
	);

	const result = await stmt.run();
	const insertedId = Number(result.meta.last_row_id);

	return json(
		{
			ok: true,
			id: insertedId,
		},
		201,
		withJsonHeaders(corsHeaders),
	);
}

function validatePayload(input: unknown): MessagePayload | { error: string } {
	if (!input || typeof input !== "object") {
		return { error: "Body must be a JSON object" };
	}

	const data = input as Record<string, unknown>;
	const name = String(data.name || "").trim();
	const email = String(data.email || "").trim().toLowerCase();
	const subject = String(data.subject || "").trim();
	const message = String(data.message || "").trim();

	if (!name || name.length < 2 || name.length > 120) {
		return { error: "name is required (2-120 chars)" };
	}
	if (!email || !EMAIL_REGEX.test(email) || email.length > 320) {
		return { error: "email is invalid" };
	}
	if (subject.length > 200) {
		return { error: "subject must be <= 200 chars" };
	}
	if (!message || message.length < 3 || message.length > 5000) {
		return { error: "message is required (3-5000 chars)" };
	}

	return { name, email, subject, message };
}

function buildCorsHeaders(request: Request, env: WorkerEnv): Headers {
	const reqOrigin = request.headers.get("Origin");
	const allowedOrigin = env.ALLOWED_ORIGIN || "*";
	const origin = allowedOrigin === "*" ? "*" : reqOrigin === allowedOrigin ? reqOrigin : "";

	const headers = new Headers();
	if (origin) {
		headers.set("Access-Control-Allow-Origin", origin);
	}
	headers.set("Vary", "Origin");
	headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
	headers.set(
		"Access-Control-Allow-Headers",
		"Content-Type, Authorization, X-Admin-Token",
	);
	headers.set("Access-Control-Max-Age", "86400");
	return headers;
}

function withJsonHeaders(base: Headers): Headers {
	const headers = new Headers(base);
	headers.set("content-type", "application/json; charset=utf-8");
	return headers;
}

function json(body: unknown, status: number, headers: Headers): Response {
	return new Response(JSON.stringify(body, null, 2), { status, headers });
}

function clampNumber(
	value: string | null,
	fallback: number,
	min: number,
	max: number,
): number {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return fallback;
	return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function isAuthorized(request: Request, adminToken?: string): boolean {
	if (!adminToken) return false;
	const bearer = request.headers.get("Authorization");
	if (bearer === `Bearer ${adminToken}`) return true;

	const headerToken = request.headers.get("X-Admin-Token");
	if (headerToken === adminToken) return true;

	const url = new URL(request.url);
	return url.searchParams.get("token") === adminToken;
}
