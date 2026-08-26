export type SettingValueType = 'string' | 'integer' | 'boolean' | 'float' | 'json' | 'array'

/** Flat map keyed by dotted setting key, e.g. "branding.primary_color". */
export type SettingsMap = Record<string, unknown>

export interface SettingUpdateItem {
  key: string
  value: unknown
  type: SettingValueType
  group: string
  is_public?: boolean
}

export interface UpdateSettingsPayload {
  settings: SettingUpdateItem[]
}
