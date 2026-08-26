import { describe, expect, it } from 'vitest'
import { setLocalizationDefaults } from './localizationDefaults'
import { formatCurrency } from './formatCurrency'
import { formatDate, formatDateTime } from './formatDate'

describe('formatCurrency', () => {
  it('uses the configured currency once ThemeContext has synced it, with no call-site change', () => {
    setLocalizationDefaults({ currency: 'INR', dateFormat: 'yyyy-MM-dd', timeFormat: 'HH:mm' })
    expect(formatCurrency(1000)).toBe('₹1,000.00')
  })

  it('an explicit currency argument still overrides the configured default', () => {
    setLocalizationDefaults({ currency: 'INR', dateFormat: 'yyyy-MM-dd', timeFormat: 'HH:mm' })
    expect(formatCurrency(1000, 'EUR')).toBe('€1,000.00')
  })
})

describe('formatDate/formatDateTime', () => {
  it('uses the configured date pattern once ThemeContext has synced it, with no call-site change', () => {
    setLocalizationDefaults({ currency: 'USD', dateFormat: 'dd/MM/yyyy', timeFormat: 'HH:mm' })
    expect(formatDate('2026-03-05T00:00:00Z')).toBe('05/03/2026')
  })

  it('an explicit pattern argument still overrides the configured default', () => {
    setLocalizationDefaults({ currency: 'USD', dateFormat: 'dd/MM/yyyy', timeFormat: 'HH:mm' })
    expect(formatDate('2026-03-05T00:00:00Z', 'yyyy-MM-dd')).toBe('2026-03-05')
  })

  it('formatDateTime picks up both the configured date and time pattern', () => {
    setLocalizationDefaults({ currency: 'USD', dateFormat: 'dd/MM/yyyy', timeFormat: 'h:mm a' })
    expect(formatDateTime('2026-03-05T14:30:00Z')).toBe('05/03/2026 2:30 PM')
  })

  it('returns the em dash placeholder for a null/undefined value regardless of configured format', () => {
    setLocalizationDefaults({ currency: 'USD', dateFormat: 'dd/MM/yyyy', timeFormat: 'HH:mm' })
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
  })
})
