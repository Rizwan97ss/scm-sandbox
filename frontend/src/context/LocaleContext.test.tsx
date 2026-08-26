import { describe, expect, it, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/testing/testUtils'
import { useLocale } from './LocaleContext'

function LocaleProbe() {
  const { locale, setLocale } = useLocale()
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <button onClick={() => setLocale('ar')}>Switch to Arabic</button>
    </div>
  )
}

describe('LocaleContext', () => {
  afterEach(() => {
    localStorage.removeItem('sms.locale')
    document.documentElement.removeAttribute('dir')
    document.documentElement.removeAttribute('lang')
  })

  it('defaults to English with ltr direction when nothing is stored', async () => {
    renderWithProviders(<LocaleProbe />)
    expect(screen.getByTestId('locale')).toHaveTextContent('en')
    await waitFor(() => expect(document.documentElement.dir).toBe('ltr'))
  })

  it('switches to an RTL language and flips the document direction', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LocaleProbe />)

    await user.click(screen.getByRole('button', { name: 'Switch to Arabic' }))

    expect(screen.getByTestId('locale')).toHaveTextContent('ar')
    await waitFor(() => expect(document.documentElement.dir).toBe('rtl'))
    expect(document.documentElement.lang).toBe('ar')
  })

  it('persists the chosen locale to localStorage', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LocaleProbe />)

    await user.click(screen.getByRole('button', { name: 'Switch to Arabic' }))

    expect(localStorage.getItem('sms.locale')).toBe('ar')
  })
})
