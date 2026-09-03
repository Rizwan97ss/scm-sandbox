import {
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  DoorOpen,
  FileQuestion,
  GraduationCap,
  LayoutDashboard,
  Layers,
  Building2,
  BarChart3,
  ScrollText,
  School,
  Settings,
  ShieldCheck,
  Sigma,
  Users,
  UsersRound,
  BookOpen,
  CalendarClock,
  NotebookPen,
  Receipt,
  Tags,
  Wallet,
  IdCard,
  CalendarOff,
  Banknote,
  Download,
  Upload,
  History,
  BookMarked,
  BookCopy,
  Bus,
  Map,
  UserCheck,
  Building,
  Bed,
  BedDouble,
  UserPlus,
  FileBadge,
  Award,
  Newspaper,
  Megaphone,
  LineChart,
  TrendingUp,
  Activity,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { routePaths } from '@/routes/routePaths'

export interface NavItemConfig {
  labelKey: string
  to: string
  icon: ComponentType<{ className?: string }>
  /** Any one of these permissions grants visibility; omit to show to every authenticated user. */
  permissions?: string[]
}

export interface NavGroupConfig {
  labelKey: string
  icon: ComponentType<{ className?: string }>
  /**
   * True only for the single "Overview" entry in every nav variant — always
   * rendered as a flat list of top-level links (no header row, no
   * expand/collapse, no icon-rail flyout), never as a collapsible
   * parent-with-submenu, regardless of sidebar collapse state.
   */
  flat?: boolean
  items: NavItemConfig[]
}

export const NAV_GROUPS: NavGroupConfig[] = [
  {
    labelKey: 'nav.groups.overview',
    icon: LayoutDashboard,
    flat: true,
    items: [{ labelKey: 'nav.items.dashboard', to: routePaths.dashboard, icon: LayoutDashboard }],
  },
  {
    labelKey: 'nav.groups.people',
    icon: Users,
    items: [
      { labelKey: 'nav.items.students', to: routePaths.students, icon: GraduationCap, permissions: ['students.view'] },
      { labelKey: 'nav.items.guardians', to: routePaths.guardians, icon: UsersRound, permissions: ['guardians.view'] },
      { labelKey: 'nav.items.staffUsers', to: routePaths.users, icon: Users, permissions: ['users.view'] },
    ],
  },
  {
    labelKey: 'nav.groups.attendance',
    icon: CalendarCheck,
    items: [
      { labelKey: 'nav.items.takeAttendance', to: routePaths.attendanceTake, icon: CalendarCheck, permissions: ['student-attendance.mark'] },
      { labelKey: 'nav.items.staffAttendance', to: routePaths.attendanceStaff, icon: ClipboardCheck },
    ],
  },
  {
    labelKey: 'nav.groups.exams',
    icon: ClipboardList,
    items: [
      { labelKey: 'nav.items.exams', to: routePaths.exams, icon: ClipboardList, permissions: ['exams.view'] },
      { labelKey: 'nav.items.examTimetable', to: routePaths.examTimetable, icon: CalendarClock, permissions: ['exam-timetable.view'] },
      { labelKey: 'nav.items.gradingScales', to: routePaths.gradingScales, icon: Sigma, permissions: ['grading.view'] },
      { labelKey: 'nav.items.examConfiguration', to: routePaths.examConfiguration, icon: Settings, permissions: ['grading.view'] },
    ],
  },
  {
    labelKey: 'nav.groups.teaching',
    icon: NotebookPen,
    items: [{ labelKey: 'nav.items.homework', to: routePaths.homework, icon: NotebookPen, permissions: ['homework.view'] }],
  },
  {
    labelKey: 'nav.groups.feesAccounting',
    icon: Wallet,
    items: [
      { labelKey: 'nav.items.invoices', to: routePaths.invoices, icon: Receipt, permissions: ['invoices.view'] },
      { labelKey: 'nav.items.feeStructures', to: routePaths.feeStructures, icon: Wallet, permissions: ['fees.view'] },
      { labelKey: 'nav.items.feeCategories', to: routePaths.feeCategories, icon: Tags, permissions: ['fees.view'] },
      { labelKey: 'nav.items.feeReports', to: routePaths.feeReports, icon: BarChart3, permissions: ['invoices.view-reports'] },
    ],
  },
  {
    labelKey: 'nav.groups.hrPayroll',
    icon: Banknote,
    items: [
      { labelKey: 'nav.items.leaveRequests', to: routePaths.leaveRequests, icon: CalendarOff },
      { labelKey: 'nav.items.payslips', to: routePaths.payslips, icon: Banknote },
      { labelKey: 'nav.items.designations', to: routePaths.designations, icon: IdCard, permissions: ['designations.view'] },
      { labelKey: 'nav.items.leaveTypes', to: routePaths.leaveTypes, icon: CalendarOff, permissions: ['leave.view', 'leave.manage'] },
      { labelKey: 'nav.items.salaryStructures', to: routePaths.salaryStructures, icon: Wallet, permissions: ['payroll.view', 'payroll.manage'] },
    ],
  },
  {
    labelKey: 'nav.groups.library',
    icon: BookMarked,
    items: [
      { labelKey: 'nav.items.books', to: routePaths.books, icon: BookMarked, permissions: ['library.view'] },
      { labelKey: 'nav.items.bookIssues', to: routePaths.bookIssues, icon: BookCopy, permissions: ['library.view'] },
    ],
  },
  {
    labelKey: 'nav.groups.transport',
    icon: Bus,
    items: [
      { labelKey: 'nav.items.vehicles', to: routePaths.vehicles, icon: Bus, permissions: ['transport.view'] },
      { labelKey: 'nav.items.routes', to: routePaths.routes, icon: Map, permissions: ['transport.view'] },
      { labelKey: 'nav.items.studentAssignments', to: routePaths.studentTransportAssignments, icon: UserCheck, permissions: ['transport.view'] },
    ],
  },
  {
    labelKey: 'nav.groups.hostel',
    icon: Building,
    items: [
      { labelKey: 'nav.items.hostels', to: routePaths.hostels, icon: Building, permissions: ['hostel.view'] },
      { labelKey: 'nav.items.hostelRooms', to: routePaths.hostelRooms, icon: Bed, permissions: ['hostel.view'] },
      { labelKey: 'nav.items.allocations', to: routePaths.hostelAllocations, icon: BedDouble, permissions: ['hostel.view'] },
    ],
  },
  {
    labelKey: 'nav.groups.frontDesk',
    icon: UserPlus,
    items: [{ labelKey: 'nav.items.visitors', to: routePaths.visitors, icon: UserPlus, permissions: ['front-desk.view'] }],
  },
  {
    labelKey: 'nav.groups.certificatesIdCards',
    icon: Award,
    items: [
      { labelKey: 'nav.items.certificateTemplates', to: routePaths.certificateTemplates, icon: FileBadge, permissions: ['certificates.create'] },
      { labelKey: 'nav.items.issuedCertificates', to: routePaths.certificates, icon: Award, permissions: ['certificates.view'] },
    ],
  },
  {
    labelKey: 'nav.groups.noticeBoard',
    icon: Newspaper,
    items: [{ labelKey: 'nav.items.noticeBoard', to: routePaths.noticeBoard, icon: Newspaper }],
  },
  {
    labelKey: 'nav.groups.communication',
    icon: Megaphone,
    items: [{ labelKey: 'nav.items.announcements', to: routePaths.announcements, icon: Megaphone, permissions: ['communication.view'] }],
  },
  {
    labelKey: 'nav.groups.reportsAnalytics',
    icon: LineChart,
    items: [
      { labelKey: 'nav.items.attendanceReport', to: routePaths.reportsAttendance, icon: LineChart, permissions: ['student-attendance.view', 'staff-attendance.view'] },
      { labelKey: 'nav.items.academicPerformance', to: routePaths.reportsAcademic, icon: TrendingUp, permissions: ['exam-marks.view'] },
      { labelKey: 'nav.items.enrollmentReport', to: routePaths.reportsEnrollment, icon: GraduationCap, permissions: ['students.view'] },
      { labelKey: 'nav.items.operationsReport', to: routePaths.reportsOperations, icon: Activity, permissions: ['library.view', 'transport.view', 'hostel.view'] },
    ],
  },
  {
    labelKey: 'nav.groups.academics',
    icon: GraduationCap,
    items: [
      { labelKey: 'nav.items.academicYears', to: routePaths.academicYears, icon: CalendarDays, permissions: ['academic-years.view'] },
      { labelKey: 'nav.items.terms', to: routePaths.terms, icon: CalendarClock, permissions: ['academic-years.view'] },
      { labelKey: 'nav.items.departments', to: routePaths.departments, icon: Building2, permissions: ['academic-structure.view'] },
      { labelKey: 'nav.items.gradeLevels', to: routePaths.gradeLevels, icon: Layers, permissions: ['academic-structure.view'] },
      { labelKey: 'nav.items.sections', to: routePaths.sections, icon: School, permissions: ['academic-structure.view'] },
      { labelKey: 'nav.items.subjects', to: routePaths.subjects, icon: BookOpen, permissions: ['academic-structure.view'] },
      { labelKey: 'nav.items.academicRooms', to: routePaths.rooms, icon: DoorOpen, permissions: ['academic-structure.view'] },
      { labelKey: 'nav.items.timetable', to: routePaths.timetable, icon: ClipboardList, permissions: ['timetable.view'] },
      { labelKey: 'nav.items.holidays', to: routePaths.holidays, icon: CalendarDays, permissions: ['academic-structure.view'] },
    ],
  },
  {
    labelKey: 'nav.groups.administration',
    icon: Settings,
    items: [
      { labelKey: 'nav.items.rolesPermissions', to: routePaths.roles, icon: ShieldCheck, permissions: ['roles.view'] },
      { labelKey: 'nav.items.settings', to: routePaths.settings, icon: Settings, permissions: ['settings.view'] },
      { labelKey: 'nav.items.systemHealth', to: routePaths.systemHealth, icon: Activity, permissions: ['settings.view'] },
      { labelKey: 'nav.items.auditLog', to: routePaths.auditLogs, icon: ScrollText, permissions: ['audit-logs.view'] },
      { labelKey: 'nav.items.importLogs', to: routePaths.importLogs, icon: History, permissions: ['audit-logs.view'] },
      { labelKey: 'nav.items.dataExport', to: routePaths.dataExports, icon: Download, permissions: ['data-export.school'] },
      { labelKey: 'nav.items.importCenter', to: routePaths.importCenter, icon: Upload, permissions: ['students.import', 'users.import'] },
    ],
  },
]

export const PARENT_NAV_GROUPS: NavGroupConfig[] = [
  {
    labelKey: 'nav.groups.overview',
    icon: LayoutDashboard,
    flat: true,
    items: [
      { labelKey: 'nav.items.dashboard', to: routePaths.dashboard, icon: LayoutDashboard },
      { labelKey: 'nav.items.myChildren', to: routePaths.parentChildren, icon: GraduationCap },
      { labelKey: 'nav.items.noticeBoard', to: routePaths.noticeBoard, icon: Newspaper },
      { labelKey: 'nav.items.certificates', to: routePaths.certificates, icon: Award },
    ],
  },
]

export const STUDENT_NAV_GROUPS: NavGroupConfig[] = [
  {
    labelKey: 'nav.groups.overview',
    icon: LayoutDashboard,
    flat: true,
    items: [
      { labelKey: 'nav.items.dashboard', to: routePaths.dashboard, icon: LayoutDashboard },
      { labelKey: 'nav.items.homework', to: routePaths.homework, icon: NotebookPen },
      { labelKey: 'nav.items.myOnlineTests', to: routePaths.myOnlineTests, icon: FileQuestion },
      { labelKey: 'nav.items.myResult', to: routePaths.myResults, icon: ClipboardList },
      { labelKey: 'nav.items.examTimetable', to: routePaths.examTimetable, icon: CalendarClock },
      { labelKey: 'nav.items.myFees', to: routePaths.invoices, icon: Receipt },
      { labelKey: 'nav.items.noticeBoard', to: routePaths.noticeBoard, icon: Newspaper },
      { labelKey: 'nav.items.certificates', to: routePaths.certificates, icon: Award },
    ],
  },
]

/**
 * Single source of truth for "which nav does this user see" — Sidebar.tsx
 * (desktop) and AppShell.tsx (mobile drawer) both call this instead of each
 * re-implementing the same role checks, after those two previously
 * disagreed (mobile gave Students the Parent nav — a bug, not a deliberate
 * difference).
 */
export function resolveNavGroups(hasRole: (...roles: string[]) => boolean): NavGroupConfig[] {
  if (hasRole('Student')) return STUDENT_NAV_GROUPS
  if (hasRole('Parent')) return PARENT_NAV_GROUPS
  return NAV_GROUPS
}
