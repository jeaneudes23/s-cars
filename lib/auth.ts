// The server checks the username and password against .env. The signed-in state
// below is still only a browser flag, so this is NOT secure until the backend exists.

const SESSION = "scars.session";

export async function login(username: string, password: string) {
  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (response.status === 401) return false;
  if (!response.ok) {
    const { error } = await response.json().catch(() => ({ error: "" }));
    throw new Error(error || "Sign-in isn't working right now. Try again.");
  }
  sessionStorage.setItem(SESSION, "1");
  localStorage.removeItem("scars.credentials"); // left over from the old browser-only sign-in
  return true;
}

export const logout = () => sessionStorage.removeItem(SESSION);
export const isLoggedIn = () => sessionStorage.getItem(SESSION) === "1";
