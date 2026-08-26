import { BookOpen, Building2, DoorOpen, GraduationCap, Layers, School, UsersRound, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { usePermission } from '@/hooks/usePermission'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { routePaths } from '@/routes/routePaths'
import '../i18n'

interface ImportOption {
  key: string
  to: string
  icon: typeof Users
  permission: string
}

const IMPORT_OPTIONS: ImportOption[] = [
  {
    key: 'students',
    to: routePaths.studentImport,
    icon: GraduationCap,
    permission: 'students.import',
  },
  {
    key: 'staff',
    to: routePaths.userImport,
    icon: Users,
    permission: 'users.import',
  },
  {
    key: 'guardians',
    to: routePaths.guardianImport,
    icon: UsersRound,
    permission: 'guardians.import',
  },
  {
    key: 'departments',
    to: routePaths.departmentImport,
    icon: Building2,
    permission: 'academic-structure.import',
  },
  {
    key: 'grade-levels',
    to: routePaths.gradeLevelImport,
    icon: Layers,
    permission: 'academic-structure.import',
  },
  {
    key: 'sections',
    to: routePaths.sectionImport,
    icon: School,
    permission: 'academic-structure.import',
  },
  {
    key: 'subjects',
    to: routePaths.subjectImport,
    icon: BookOpen,
    permission: 'academic-structure.import',
  },
  {
    key: 'rooms',
    to: routePaths.roomImport,
    icon: DoorOpen,
    permission: 'academic-structure.import',
  },
]

/**
 * One place to discover every bulk-import feature, rather than each one
 * being reachable only from inside its own module. Exam Marks and Question
 * Bank imports also exist (POST /exam-subjects/{id}/marks/import,
 * POST /questions/import) but are deliberately not listed here — both need
 * a specific exam subject as context, so they're only reachable from
 * within that exam/subject's own page, not as a standalone destination.
 */
export function ImportCenterPage() {
  const { can } = usePermission()
  const { t } = useFeatureTranslation('imports')
  const visible = IMPORT_OPTIONS.filter((option) => can(option.permission))

  return (
    <div>
      <PageHeader title={t('center.title')} description={t('center.description')} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((option) => (
          <Link key={option.key} to={option.to}>
            <Card className="h-full transition-colors hover:border-primary">
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <option.icon className="h-5 w-5 text-primary" />
                <CardTitle>{t(`center.options.${option.key}.label`)}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{t(`center.options.${option.key}.description`)}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {visible.length === 0 && <p className="text-sm text-muted-foreground">{t('center.noPermission')}</p>}
    </div>
  )
}
