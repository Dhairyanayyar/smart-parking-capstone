export async function api(path, method = "GET", body) {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      data.message || "Please check the highlighted fields."
    );

    error.status = response.status;
    error.fields = data.errors || {};

    throw error;
  }

  return data;
}