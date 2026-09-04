import type { TFunction } from 'i18next'

export interface CourseMaterialAttachment {
  id: number
  file_name: string
  size: number
  url: string
}

export const COURSE_MATERIAL_TYPES = ['document', 'link', 'video'] as const
export type CourseMaterialType = (typeof COURSE_MATERIAL_TYPES)[number]
export const getCourseMaterialTypeLabels = (t: TFunction): Record<CourseMaterialType, string> => ({
  document: t('fields.typeDocument'),
  link: t('fields.typeLink'),
  video: t('fields.typeVideo'),
})

export interface CourseMaterialProgress {
  viewed_at: string | null
  completed_at: string | null
}

export interface CourseMaterial {
  id: number
  section?: { id: number; name: string }
  subject?: { id: number; name: string }
  teacher?: { id: number; full_name: string }
  title: string
  description: string | null
  type: CourseMaterialType
  url: string | null
  is_published: boolean
  attachments: CourseMaterialAttachment[]
  /** Only present when the viewer is a Student — their own progress, if any. */
  my_progress: CourseMaterialProgress | null
  created_at: string
}

export interface CourseMaterialPayload {
  section_id: number
  subject_id: number
  title: string
  description?: string | null
  type: CourseMaterialType
  url?: string | null
  is_published?: boolean
}
