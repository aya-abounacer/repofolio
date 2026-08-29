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

  try {
    const existingSessionId = req.cookies.session_id;

    if (existingSessionId) {
      await pool.query(
        `
        UPDATE sessions
        SET last_seen = NOW()
        WHERE id = $1
        `,
        [existingSessionId]
      );

      return res.json({
        success: true,
        sessionId: existingSessionId,
        existing: true,
      });
    }

    const sessionId = crypto.randomUUID();

    await pool.query(
      `
      INSERT INTO sessions (id)
      VALUES ($1)
      `,
      [sessionId]
    );

    res.setHeader(
      "Set-Cookie",
      `session_id=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`
    );

    return res.json({
      success: true,
      sessionId,
      existing: false,
    });
  } catch (error) {
    console.error("Session error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to create session",
    });
  }
}