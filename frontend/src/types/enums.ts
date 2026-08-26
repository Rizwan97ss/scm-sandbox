import type { TFunction } from 'i18next'

/**
 * Mirrors the backend's App\Enums\* classes. These are protocol-level values
 * (the API request/response contract), not admin-configurable data, so they
 * live here as the single frontend source of truth rather than being
 * hardcoded inline wherever a status badge or select option is rendered.
 *
 * Labels are functions of `t`, not plain constants — the display text is
 * translated (see locales/en/common.json's `enums.*` section) while the
 * underlying value stays the fixed English wire-protocol string the backend
 * expects. Call with any `t` in scope (`common:` namespace prefix means it
 * doesn't matter which namespace that `t` is otherwise bound to).
 */

export const GENDERS = ['male', 'female', 'other'] as const
export type Gender = (typeof GENDERS)[number]
export const getGenderLabels = (t: TFunction): Record<Gender, string> => ({
  male: t('common:enums.gender.male'),
  female: t('common:enums.gender.female'),
  other: t('common:enums.gender.other'),
})

export const USER_STATUSES = ['active', 'inactive', 'suspended'] as const
export type UserStatus = (typeof USER_STATUSES)[number]
export const getUserStatusLabels = (t: TFunction): Record<UserStatus, string> => ({
  active: t('common:enums.userStatus.active'),
  inactive: t('common:enums.userStatus.inactive'),
  suspended: t('common:enums.userStatus.suspended'),
})

export const STUDENT_STATUSES = ['active', 'transferred_out', 'withdrawn', 'graduated', 'alumni'] as const
export type StudentStatus = (typeof STUDENT_STATUSES)[number]
export const getStudentStatusLabels = (t: TFunction): Record<StudentStatus, string> => ({
  active: t('common:enums.studentStatus.active'),
  transferred_out: t('common:enums.studentStatus.transferred_out'),
  withdrawn: t('common:enums.studentStatus.withdrawn'),
  graduated: t('common:enums.studentStatus.graduated'),
  alumni: t('common:enums.studentStatus.alumni'),
})

export const ENROLLMENT_ACTIONS = [
  'admission',
  'promotion',
  'transfer_in',
  'transfer_out',
  'withdrawal',
  'graduation',
  'reactivation',
] as const
export type EnrollmentAction = (typeof ENROLLMENT_ACTIONS)[number]
export const getEnrollmentActionLabels = (t: TFunction): Record<EnrollmentAction, string> => ({
  admission: t('common:enums.enrollmentAction.admission'),
  promotion: t('common:enums.enrollmentAction.promotion'),
  transfer_in: t('common:enums.enrollmentAction.transfer_in'),
  transfer_out: t('common:enums.enrollmentAction.transfer_out'),
  withdrawal: t('common:enums.enrollmentAction.withdrawal'),
  graduation: t('common:enums.enrollmentAction.graduation'),
  reactivation: t('common:enums.enrollmentAction.reactivation'),
})

export const GUARDIAN_RELATIONSHIPS = ['father', 'mother', 'guardian', 'other'] as const
export type GuardianRelationship = (typeof GUARDIAN_RELATIONSHIPS)[number]
export const getGuardianRelationshipLabels = (t: TFunction): Record<GuardianRelationship, string> => ({
  father: t('common:enums.guardianRelationship.father'),
  mother: t('common:enums.guardianRelationship.mother'),
  guardian: t('common:enums.guardianRelationship.guardian'),
  other: t('common:enums.guardianRelationship.other'),
})

export const ROOM_TYPES = ['classroom', 'lab', 'hall', 'other'] as const
export type RoomType = (typeof ROOM_TYPES)[number]
export const getRoomTypeLabels = (t: TFunction): Record<RoomType, string> => ({
  classroom: t('common:enums.roomType.classroom'),
  lab: t('common:enums.roomType.lab'),
  hall: t('common:enums.roomType.hall'),
  other: t('common:enums.roomType.other'),
})

export const HOLIDAY_TYPES = ['public', 'school_specific'] as const
export type HolidayType = (typeof HOLIDAY_TYPES)[number]
export const getHolidayTypeLabels = (t: TFunction): Record<HolidayType, string> => ({
  public: t('common:enums.holidayType.public'),
  school_specific: t('common:enums.holidayType.school_specific'),
})

export const ACADEMIC_YEAR_STATUSES = ['upcoming', 'active', 'closed'] as const
export type AcademicYearStatus = (typeof ACADEMIC_YEAR_STATUSES)[number]

export const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'half_day', 'excused', 'on_leave'] as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]
export const getAttendanceStatusLabels = (t: TFunction): Record<AttendanceStatus, string> => ({
  present: t('common:enums.attendanceStatus.present'),
  absent: t('common:enums.attendanceStatus.absent'),
  late: t('common:enums.attendanceStatus.late'),
  half_day: t('common:enums.attendanceStatus.half_day'),
  excused: t('common:enums.attendanceStatus.excused'),
  on_leave: t('common:enums.attendanceStatus.on_leave'),
})

/** Carbon/PHP day-of-week numbering: 0 = Sunday ... 6 = Saturday. */
export const getDaysOfWeek = (t: TFunction): { value: number; label: string }[] => [
  { value: 0, label: t('common:enums.daysOfWeek.0') },
  { value: 1, label: t('common:enums.daysOfWeek.1') },
  { value: 2, label: t('common:enums.daysOfWeek.2') },
  { value: 3, label: t('common:enums.daysOfWeek.3') },
  { value: 4, label: t('common:enums.daysOfWeek.4') },
  { value: 5, label: t('common:enums.daysOfWeek.5') },
  { value: 6, label: t('common:enums.daysOfWeek.6') },
]
