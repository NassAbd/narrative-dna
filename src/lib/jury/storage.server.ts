/** Private service-role RPC transport. Never import this module into UI code. */
export type JuryBindings = Record<string, string | undefined>;
export class JuryError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}
export function bindings(env: unknown): JuryBindings {
  const supplied = env && typeof env === "object" ? env as Record<string, unknown> : {};
  const names = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "JURY_ACCESS_PASSWORD", "JURY_LIVE_ENABLED", "ORIANE_API_KEY", "OPENAI_API_KEY"];
  return Object.fromEntries(names.map(name => [name, typeof supplied[name] === "string" ? supplied[name] : process.env[name]]));
}
export type Rpc = (action: string, args?: Record<string, unknown>) => Promise<Record<string, any>>;
export function storage(secrets: JuryBindings): Rpc {
  return async (action, args = {}) => {
    const url = secrets["SUPABASE_URL"], key = secrets["SUPABASE_SERVICE_ROLE_KEY"];
    if (!url || !key) throw new JuryError("unavailable", 503);
    const headers = new Headers({ "content-type": "application/json", apikey: key });
    if (!key.startsWith("sb_")) headers.set("authorization", `Bearer ${key}`);
    try {
      const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/jury_backend`, {
        method: "POST", headers, body: JSON.stringify({ p_action: action, p_args: args }), signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) throw new JuryError("storage_unavailable", 503);
      const data = await response.json() as Record<string, any>;
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new JuryError("storage_unavailable", 503);
      if (data["error"]) throw new JuryError(String(data["error"]), Number(data["status"] ?? 409));
      return data;
    } catch (error) {
      if (error instanceof JuryError) throw error;
      throw new JuryError("storage_unavailable", 503);
    }
  };
}