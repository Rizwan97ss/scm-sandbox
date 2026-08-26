import type { TFunction } from 'i18next'

export const NOTICE_TYPES = ['general', 'event'] as const
export type NoticeTypeValue = (typeof NOTICE_TYPES)[number]
export const getNoticeTypeLabels = (t: TFunction): Record<NoticeTypeValue, string> => ({
  general: t('common:enums.noticeType.general'),
  event: t('common:enums.noticeType.event'),
})

export const AUDIENCES = ['all', 'students', 'staff', 'parents'] as const
export type AudienceValue = (typeof AUDIENCES)[number]
export const getAudienceLabels = (t: TFunction): Record<AudienceValue, string> => ({
  all: t('common:enums.audience.all'),
  students: t('common:enums.audience.students'),
  staff: t('common:enums.audience.staff'),
  parents: t('common:enums.audience.parents'),
})

export interface Notice {
  id: number
  title: string
  body: string
  type: NoticeTypeValue
  type_label: string
  audience: AudienceValue
  audience_label: string
  event_date: string | null
  start_time: string | null
  end_time: string | null
  location: string | null
  is_published: boolean
  published_at: string | null
  expires_at: string | null
  created_by?: { id: number; full_name: string }
  created_at: string
}

export interface NoticePayload {
  title: string
  body: string
  type?: NoticeTypeValue
  audience?: AudienceValue
  event_date?: string | null
  start_time?: string | null
  end_time?: string | null
  location?: string | null
  expires_at?: string | null
}
