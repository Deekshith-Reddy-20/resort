const keys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_v_farm_resort_SUPABASE_URL",
  "v_farm_resort_SUPABASE_URL",
  "v_farm_resort_POSTGRES_URL_NON_POOLING",
  "v_farm_resort_POSTGRES_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "v_farm_resort_SUPABASE_SERVICE_ROLE_KEY",
  "PROPERTY_ID",
  "DATABASE_MODE",
];
for (const key of keys) {
  const value = process.env[key]?.trim() || "";
  const redacted = value === "[SENSITIVE]";
  console.log(key, "present=" + Boolean(value && !redacted), "redacted=" + redacted, "len=" + value.length);
}
