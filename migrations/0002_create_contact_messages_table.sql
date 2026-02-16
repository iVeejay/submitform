-- Migration number: 0002 	 2026-02-16T00:00:00.000Z
CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    ip TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at
ON contact_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_messages_email
ON contact_messages(email);
