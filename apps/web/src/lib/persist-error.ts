export type PersistReason =
  | "missing_config"
  | "missing_table"
  | "permission"
  | "invalid_credentials"
  | "connectivity"
  | "invalid_payload"
  | "unknown";

export type PersistFailure = {
  operation: string;
  code: string | null;
  reason: PersistReason;
  message: string;
};

export function classifyPersistError(operation: string, error: { code?: string; message?: string; status?: number } | null): PersistFailure {
  const code = error?.code ?? (error?.status != null ? String(error.status) : null);
  const raw = `${error?.message ?? ""} ${code ?? ""}`.toLowerCase();
  let reason: PersistReason = "unknown";
  if (!error) reason = "unknown";
  else if (code === "PGRST205" || code === "42P01" || /schema cache|does not exist|could not find the table/.test(raw)) {
    reason = "missing_table";
  } else if (code === "PGRST116") {
    reason = "unknown";
  } else if (code === "42501" || code === "PGRST301" || /permission|rls|row-level security/.test(raw)) {
    reason = "permission";
  } else if (code === "401" || code === "403" || /jwt|invalid api key|invalid_api_key/.test(raw)) {
    reason = "invalid_credentials";
  } else if (/fetch|network|enotfound|econnrefused|timeout/.test(raw)) {
    reason = "connectivity";
  } else if (/payload|json|hydrate|serialize/.test(raw)) {
    reason = "invalid_payload";
  }

  const message =
    reason === "missing_table"
      ? "The inventory table runtime_state is missing. Apply supabase/migrations/20261013123000_runtime_state.sql in the linked Supabase project."
      : reason === "permission"
        ? "The server could not read inventory because of a database permission error."
        : reason === "invalid_credentials"
          ? "The server could not authenticate to the inventory database."
          : reason === "connectivity"
            ? "The inventory database could not be reached. Retry shortly."
            : reason === "invalid_payload"
              ? "Stored inventory data could not be read. Staff must repair the runtime_state payload."
              : "Inventory store could not be loaded from the database.";

  return { operation, code, reason, message };
}

export function clientPersistMessage(failure: PersistFailure) {
  return failure.message;
}

export class PersistError extends Error {
  failure: PersistFailure;
  constructor(failure: PersistFailure) {
    super(failure.message);
    this.name = "PersistError";
    this.failure = failure;
  }
}
