import type { AnalysisResult, AnalyzeOptions, ProgressEvent, StepId } from "../narrative/types";
import { SessionSchema, LiveJobSchema } from "./result-schema";
import { type LiveQuery, STAGES } from "./contracts";
const messages: Record<string, string> = {
  invalid_credentials: "Incorrect password.",
  incorrect_password: "Incorrect password.",
  unauthenticated: "Your session has expired. Please sign in again.",
  unavailable: "Jury Live is temporarily unavailable. Explore is still available.",
  storage_unavailable: "Jury Live is temporarily unavailable. Explore is still available.",
  login_limited: "Too many attempts. Please try again later.",
  execution_timeout: "Analysis timed out. Its reserved quota is retained.",
  insufficient_evidence:
    "The retrieved videos contain insufficient source-grounded evidence for this topic.",
  openai_timeout: "OpenAI timed out. The reserved quota is retained; no automatic retry was made.",
  oriane_timeout: "Oriane timed out. The reserved quota is retained; no automatic retry was made.",
  no_results: "No usable videos were returned for this topic.",
  oriane_budget: "Oriane credits are unavailable. The reserved quota is retained.",
  oriane_limited: "Oriane is temporarily rate limited. The reserved quota is retained.",
  openai_limited: "OpenAI is temporarily rate limited. The reserved quota is retained.",
  rate_limited: "Too many attempts. Please try again later.",
  quota_exhausted: "The global jury quota is exhausted.",
  busy: "Another analysis is running. Please try again after it finishes.",
  csrf_rejected: "Your session needs refreshing. Please sign in again.",
  live_unavailable: "Jury Live is temporarily unavailable. Explore is still available.",
  unauthorized: "Your session has expired. Please sign in again.",
  provider_budget_unavailable: "The provider budget is unavailable.",
  provider_rate_limited: "The provider is temporarily rate limited.",
  timeout: "Analysis timed out. Its reserved quota is retained.",
  cancelled: "Analysis cancelled. Its reserved quota is retained.",
  invalid_result:
    "The backend response could not be validated. No unverified evidence is displayed.",
};
export class JuryClientError extends Error {
  constructor(public code: string) {
    super(
      messages[code] ??
        "The analysis could not be completed. No new provider call was retried automatically.",
    );
  }
}
function parseJob(value: unknown) {
  const result = LiveJobSchema.safeParse(value);
  if (!result.success) throw new JuryClientError("invalid_result");
  return result.data;
}
function parseSession(value: unknown) {
  const result = SessionSchema.safeParse(value);
  if (!result.success) throw new JuryClientError("live_unavailable");
  return result.data;
}
export function createJuryClient(fetcher: typeof fetch = fetch) {
  let csrf = "";
  let currentJob: string | null = null;
  async function request(path: string, body?: unknown, signal?: AbortSignal): Promise<unknown> {
    const response = await fetcher("/api/jury" + path, {
      method: body === undefined ? "GET" : "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers:
        body === undefined
          ? {}
          : {
              "content-type": "application/json",
              "x-jury-request": "1",
              ...(csrf ? { "x-csrf-token": csrf } : {}),
            },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...(signal ? { signal } : {}),
    });
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new JuryClientError("live_unavailable");
    }
    if (!response.ok) {
      const code =
        typeof data === "object" &&
        data !== null &&
        "errorCode" in data &&
        typeof data.errorCode === "string"
          ? data.errorCode
          : response.status === 401
            ? "unauthorized"
            : response.status === 429
              ? "rate_limited"
              : "live_unavailable";
      throw new JuryClientError(code);
    }
    return data;
  }
  async function session() {
    const s = parseSession(await request("/session"));
    csrf = s.csrfToken ?? "";
    return s;
  }
  async function login(password: string) {
    const s = parseSession(await request("/login", { password }));
    csrf = s.csrfToken ?? "";
    return s;
  }
  async function logout() {
    await request("/logout", {});
    csrf = "";
    currentJob = null;
  }
  const map: Record<string, StepId> = {
    search: "collect",
    retrieve: "retrieve",
    extract: "extract",
    group: "cluster",
    verify: "verify",
    ready: "verify",
  };
  function emit(
    job: ReturnType<typeof LiveJobSchema.parse>,
    onProgress?: (event: ProgressEvent) => void,
  ) {
    for (const s of STAGES.filter((s) => s !== "ready"))
      onProgress?.({
        step: map[s]!,
        status: job.completedStages.includes(s) ? "done" : job.stage === s ? "active" : "pending",
      });
  }
  async function wait(
    initial: ReturnType<typeof LiveJobSchema.parse>,
    options: AnalyzeOptions = {},
  ): Promise<AnalysisResult> {
    let job = initial;
    currentJob = job.id;
    let executionError: unknown;
    const execution =
      job.status === "queued"
        ? request(`/jobs/${job.id}/run`, {}, options.signal)
            .then((data) => {
              const parsed = parseJob(data);
              if (parsed.status === "completed") job = parsed;
            })
            .catch((error) => {
              executionError = error;
            })
        : Promise.resolve();
    const start = Date.now();
    while (true) {
      if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
      emit(job, options.onProgress);
      if (job.status === "completed") {
        await execution;
        if (!job.result) throw new JuryClientError("invalid_result");
        currentJob = null;
        return { ...job.result, cached: job.cached } as AnalysisResult;
      }
      if (job.status === "failed" || job.status === "cancelled") {
        await execution;
        currentJob = null;
        throw new JuryClientError(
          job.errorCode ?? (job.status === "cancelled" ? "cancelled" : "analysis_failed"),
        );
      }
      if (Date.now() - start > 130000) throw new JuryClientError("timeout");
      if (
        executionError instanceof JuryClientError &&
        ["unauthorized", "csrf_rejected"].includes(executionError.code)
      )
        throw executionError;
      await new Promise<void>((resolve, reject) => {
        const id = setTimeout(() => {
          options.signal?.removeEventListener("abort", onAbort);
          resolve();
        }, 900);
        const onAbort = () => {
          clearTimeout(id);
          reject(new DOMException("Aborted", "AbortError"));
        };
        options.signal?.addEventListener("abort", onAbort, { once: true });
      });
      job = parseJob(await request(`/jobs/${job.id}`, undefined, options.signal));
    }
  }
  return {
    session,
    login,
    logout,
    async analyze(query: LiveQuery, options: AnalyzeOptions = {}) {
      const job = parseJob(
        await request("/jobs", { query, idempotencyKey: crypto.randomUUID() }, options.signal),
      );
      return wait(job, options);
    },
    async resume(id: string, options: AnalyzeOptions = {}) {
      return wait(parseJob(await request(`/jobs/${id}`, undefined, options.signal)), options);
    },
    async cancel() {
      if (currentJob) await request(`/jobs/${currentJob}/cancel`, {});
    },
  };
}
export type JuryClient = ReturnType<typeof createJuryClient>;
