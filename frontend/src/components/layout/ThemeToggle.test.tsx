import { describe, expect, it, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/testing/testUtils'
import { ThemeToggle } from './ThemeToggle'

describe('ThemeToggle', () => {
  afterEach(() => {
    localStorage.removeItem('sms.theme-preference')
    document.documentElement.removeAttribute('data-theme')
  })

  it('opens a menu with Light/Dark/System options and applies the chosen one', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: 'Change theme' }))
    expect(screen.getByText('Dark')).toBeInTheDocument()

    await user.click(screen.getByText('Dark'))

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem('sms.theme-preference')).toBe('dark')
  })
})
