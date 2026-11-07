import { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool } from "pg";
import crypto from "crypto";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  const client = await pool.connect();

  try {
    const existingSessionId = req.cookies.session_id;
    const ipAddress = req.headers["x-forwarded-for"] || null;
    const userAgent = req.headers["user-agent"] || null;
    const country = req.headers["x-vercel-ip-country"] || null;
    const eventType =
      req.body?.event_type === "generated_portfolio"
        ? "generated_portfolio"
        : "visited";

    await client.query("BEGIN");

    let sessionId: string = "";
    let isReusedSession = false; // true only if the cookie's id matched a row we just updated

    // try to reuse the session from the cookie, if there is one
    if (existingSessionId) {
      const result = await client.query(
        `
        UPDATE sessions
        SET
          last_seen = NOW(),
          ip_address = $2,
          user_agent = $3,
          country = $4
        WHERE id = $1
        RETURNING id
        `,
        [existingSessionId, ipAddress, userAgent, country]
      );

      if (result.rowCount) { //if the Update changed at least one row
        sessionId = existingSessionId;
        isReusedSession = true;
      }
    }

    // covers both cases: no cookie at all, OR cookie present but UPDATE matched nothing
    if (!isReusedSession) { //if !isReusedSession ===true
      sessionId = crypto.randomUUID();
      await client.query(
        `
        INSERT INTO sessions (id, ip_address, user_agent, country)
        VALUES ($1, $2, $3, $4)
        `,
        [sessionId, ipAddress, userAgent, country]
      );
    }

    // always log the event, regardless of which branch above ran
    await client.query(
      `
      INSERT INTO events (session_id, event_type)
      VALUES ($1, $2)
      `,
      [sessionId, eventType]
    );

    await client.query("COMMIT");

    if (!isReusedSession) {
      res.setHeader(
        "Set-Cookie",
        `session_id=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${
          process.env.NODE_ENV === "production" ? "; Secure" : ""
        }`
      );
    }

    return res.json({
      success: true,
      sessionId,
      existing: isReusedSession,
      eventType,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Session error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to create session",
    });
  } finally {
    client.release();
  }
}