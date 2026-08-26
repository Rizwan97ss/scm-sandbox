import type { TFunction } from 'i18next'

export const HOSTEL_TYPES = ['boys', 'girls', 'mixed'] as const
export type HostelTypeValue = (typeof HOSTEL_TYPES)[number]
export const getHostelTypeLabels = (t: TFunction): Record<HostelTypeValue, string> => ({
  boys: t('common:enums.hostelType.boys'),
  girls: t('common:enums.hostelType.girls'),
  mixed: t('common:enums.hostelType.mixed'),
})

export interface Hostel {
  id: number
  name: string
  type: HostelTypeValue
  type_label: string
  address: string | null
  warden_name: string | null
  warden_phone: string | null
  is_active: boolean
  room_count?: number
  created_at: string
}

export interface HostelPayload {
  name: string
  type: HostelTypeValue
  address?: string | null
  warden_name?: string | null
  warden_phone?: string | null
  is_active?: boolean
}

export interface HostelRoom {
  id: number
  hostel?: { id: number; name: string }
  room_number: string
  capacity: number
  occupied_count: number
  is_active: boolean
  created_at: string
}

export interface HostelRoomPayload {
  hostel_id: number
  room_number: string
  capacity: number
  is_active?: boolean
}

export const HOSTEL_ALLOCATION_STATUSES = ['allocated', 'vacated'] as const
export type HostelAllocationStatus = (typeof HOSTEL_ALLOCATION_STATUSES)[number]
export const getHostelAllocationStatusLabels = (t: TFunction): Record<HostelAllocationStatus, string> => ({
  allocated: t('common:enums.hostelAllocationStatus.allocated'),
  vacated: t('common:enums.hostelAllocationStatus.vacated'),
})

export interface HostelAllocation {
  id: number
  student?: { id: number; full_name: string }
  hostel_room?: { id: number; room_number: string; hostel: { id: number; name: string } | null }
  bed_number: string | null
  allocated_date: string
  vacated_date: string | null
  status: HostelAllocationStatus
  status_label: string
  created_at: string
}

export interface HostelAllocationPayload {
  student_id: number
  hostel_room_id: number
  bed_number?: string | null
  allocated_date: string
}
