export const ADMIN_SETTINGS_TABLE = "admin_settings";

export async function getAdminSetting(adminClient, settingKey, fallbackValue = {}) {
  const { data, error } = await adminClient
    .from(ADMIN_SETTINGS_TABLE)
    .select("setting_value")
    .eq("setting_key", settingKey)
    .maybeSingle();
  if (error) throw error;
  if (!data || typeof data.setting_value !== "object" || data.setting_value == null) return fallbackValue;
  return data.setting_value;
}

export async function upsertAdminSetting(adminClient, settingKey, settingValue, updatedBy = "") {
  const { error } = await adminClient.from(ADMIN_SETTINGS_TABLE).upsert(
    {
      setting_key: settingKey,
      setting_value: settingValue,
      updated_by: updatedBy || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "setting_key" },
  );
  if (error) throw error;
}
