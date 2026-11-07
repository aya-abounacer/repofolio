export async function createSession(eventType: string = "visited") {
  const response = await fetch("/api/session", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_type: eventType }),
  });

  if (!response.ok) {
    throw new Error("Failed to create session");
  }

  return response.json();
}