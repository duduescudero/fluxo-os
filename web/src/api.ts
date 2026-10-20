export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body) headers.set("Content-Type", "application/json");
  if (options.method && !["GET", "HEAD"].includes(options.method)) {
    const csrf = await fetch("/api/auth/csrf", { credentials: "same-origin" });
    if (!csrf.ok)
      throw new ApiError(csrf.status, "Não foi possível validar a sessão.");
    const token = await csrf.json();
    headers.set("X-CSRF-TOKEN", token.token);
  }
  const response = await fetch("/api" + path, {
    ...options,
    headers,
    credentials: "same-origin",
  });
  if (!response.ok) {
    let title = "Não foi possível concluir a operação.";
    try {
      const error = await response.json();
      title = error.title || title;
    } catch {
      /* Empty responses such as auth failures. */
    }
    if (response.status === 401 && !path.startsWith("/auth/"))
      window.dispatchEvent(new Event("session-expired"));
    throw new ApiError(response.status, title);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export const body = (value: unknown) => JSON.stringify(value);
