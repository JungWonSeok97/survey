export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public field?: string,
  ) {
    super(message);
  }
}
export async function requestJSON<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(url, {
      ...options,
      cache: "no-store",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...options.headers },
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success)
      throw new ApiError(
        (data?.error || "요청을 처리하지 못했습니다. 다시 시도해주세요.") +
            (data?.requestId ? ` (문의 번호 ${data.requestId})` : ""),
        response.status,
        data?.field,
      );
    return data as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError")
      throw new ApiError(
        "응답이 지연되고 있습니다. 저장 상태를 확인하거나 같은 응답으로 다시 시도해주세요.",
        408,
      );
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
