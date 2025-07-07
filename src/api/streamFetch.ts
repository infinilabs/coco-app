export async function streamPost({
  url,
  body,
  queryParams,
  headers,
  onMessage,
  onError,
}: {
  url: string;
  body: any;
  queryParams?: Record<string, any>;
  headers?: Record<string, string>;
  onMessage: (chunk: string) => void;
  onError?: (err: any) => void;
}) {
  const appStore = JSON.parse(localStorage.getItem("app-store") || "{}");

  let baseURL = appStore.state?.endpoint_http
  if (!baseURL || baseURL === "undefined") {
    baseURL = "";
  }

  const query = new URLSearchParams(queryParams || {}).toString();
  const fullUrl = `${baseURL}${url}?${query}`;

  try {
    const res = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(headers || {}),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok || !res.body) throw new Error("Stream failed");

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (line) onMessage(line);
      }
      buffer = lines[lines.length - 1];
    }
  } catch (err) {
    console.error("streamPost error:", err);
    onError?.(err);
  }
}
