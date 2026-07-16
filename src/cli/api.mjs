export async function apiRequest({ config, path, method = "GET", body }) {
  const appUrl = config.appUrl?.trim();
  const token = config.auth?.token?.trim();

  if (!appUrl) {
    throw new Error("InContext app URL is not configured. Run `incontext login --app-url <url>` first.");
  }

  if (!token) {
    throw new Error("InContext CLI token is missing. Run `incontext login` first.");
  }

  const response = await fetch(new URL(path, appUrl), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;

    try {
      const payload = await response.json();

      if (payload.error) {
        message = payload.error;
      }
    } catch {
      // Ignore response parsing failures.
    }

    throw new Error(message);
  }

  return response.json();
}
