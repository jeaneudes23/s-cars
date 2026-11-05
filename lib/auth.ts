// Browser side of sign-in. The server checks passwords and keeps the session.

const jsonRequest = (method: string, body: unknown): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

// Returns an error message, or null when signed in.
export async function login(username: string, password: string) {
  try {
    const response = await fetch("/api/admin/login", jsonRequest("POST", { username, password }));
    if (response.ok) return null;
    return (await response.json()).error as string;
  } catch {
    return "Couldn't reach the server. Check your connection and try again.";
  }
}

export async function logout() {
  await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
  window.location.assign("/admin/login");
}

export async function currentUsername() {
  const response = await fetch("/api/admin/credentials");
  return response.ok ? ((await response.json()).username as string) : "";
}

// Returns null when saved, or which field failed and why.
export async function updateCredentials(change: { currentPassword: string; username: string; newPassword?: string }) {
  try {
    const response = await fetch("/api/admin/credentials", jsonRequest("PUT", change));
    if (response.ok) return null;
    const body = await response.json();
    return { field: (body.field as string) || "form", message: (body.message || body.error) as string };
  } catch {
    return { field: "form", message: "Couldn't reach the server. Check your connection and try again." };
  }
}
