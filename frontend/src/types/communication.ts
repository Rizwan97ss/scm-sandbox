import type { TFunction } from 'i18next'
import type { AudienceValue } from './noticeBoard'

export const ANNOUNCEMENT_CHANNELS = ['in_app', 'email', 'sms', 'push'] as const
export type AnnouncementChannel = (typeof ANNOUNCEMENT_CHANNELS)[number]
export const getAnnouncementChannelLabels = (t: TFunction): Record<AnnouncementChannel, string> => ({
  in_app: t('common:enums.announcementChannel.in_app'),
  email: t('common:enums.announcementChannel.email'),
  sms: t('common:enums.announcementChannel.sms'),
  push: t('common:enums.announcementChannel.push'),
})

export interface Announcement {
  id: number
  title: string
  body: string
  audience: AudienceValue
  audience_label: string
  channels: AnnouncementChannel[]
  recipient_count: number
  sent_by?: { id: number; full_name: string }
  sent_at: string
}

export interface AnnouncementPayload {
  title: string
  body: string
  audience: AudienceValue
  channels: AnnouncementChannel[]
}
