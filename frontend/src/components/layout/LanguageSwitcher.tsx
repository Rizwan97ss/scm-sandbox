import { Check, Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Dropdown, type DropdownItem } from '@/components/ui/Dropdown'
import { useLocale } from '@/context/LocaleContext'
import { SUPPORTED_LANGUAGES } from '@/config/languages'

export function LanguageSwitcher() {
  const { t } = useTranslation()
  const { locale, setLocale } = useLocale()

  const items: DropdownItem[] = SUPPORTED_LANGUAGES.map((lang) => ({
    label: lang.nativeName,
    icon: lang.code === locale ? <Check className="h-4 w-4" /> : <span className="h-4 w-4" />,
    onSelect: () => setLocale(lang.code),
  }))

  return (
    <Dropdown
      trigger={
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t('language.changeLanguage')}
        >
          <Languages className="h-4 w-4" />
        </button>
      }
      items={items}
    />
  )
}
