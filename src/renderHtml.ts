type MessageRow = {
	id: number;
	name: string;
	email: string;
	subject: string | null;
	message: string;
	created_at: string;
};

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");
}

export function renderHtml(rows: unknown[]) {
	const content = (rows as MessageRow[])
		.map((row) => {
			return `<tr>
		<td>${row.id}</td>
		<td>${escapeHtml(row.name)}</td>
		<td><a href="mailto:${escapeHtml(row.email)}">${escapeHtml(row.email)}</a></td>
		<td>${escapeHtml(row.subject || "-")}</td>
		<td>${escapeHtml(row.message)}</td>
		<td>${escapeHtml(row.created_at)}</td>
	</tr>`;
		})
		.join("");

	return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Contact Messages</title>
        <style>
          :root { color-scheme: light; }
          body {
            margin: 0;
            padding: 24px;
            font-family: "Segoe UI", Arial, sans-serif;
            background: #f6f8fb;
            color: #1f2937;
          }
          .card {
            background: white;
            border-radius: 14px;
            box-shadow: 0 12px 30px rgba(31, 41, 55, 0.1);
            overflow: hidden;
          }
          .header {
            padding: 16px 20px;
            border-bottom: 1px solid #e5e7eb;
          }
          .header h1 {
            margin: 0;
            font-size: 18px;
          }
          .table-wrap {
            overflow-x: auto;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            min-width: 900px;
          }
          th, td {
            padding: 12px 14px;
            text-align: left;
            border-bottom: 1px solid #eef2f7;
            vertical-align: top;
            font-size: 14px;
          }
          th {
            background: #f8fafc;
            position: sticky;
            top: 0;
            z-index: 1;
          }
          td:nth-child(5) {
            max-width: 500px;
            white-space: pre-wrap;
            line-height: 1.4;
          }
          .empty {
            padding: 24px;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1>Portfolio Contact Messages</h1>
          </div>
          <div class="table-wrap">
            ${
							content
								? `<table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Subject</th>
                  <th>Message</th>
                  <th>Received</th>
                </tr>
              </thead>
              <tbody>${content}</tbody>
            </table>`
								: `<div class="empty">No messages yet.</div>`
						}
          </div>
        </div>
      </body>
    </html>
`;
}
