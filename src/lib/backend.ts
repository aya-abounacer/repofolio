export async function createSession() {
  const response = await fetch("/api/session", {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to create session");
  }

  return response.json();
}