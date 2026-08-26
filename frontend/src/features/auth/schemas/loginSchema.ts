import { z } from 'zod'

/**
 * Messages here are i18next key paths (relative to the "auth" namespace's
 * "validation" section), not user-facing text — LoginForm translates them
 * at display time via t(errors.field.message). This keeps the validation
 * RULE (.min(1)) untouched while making the displayed message translatable
 * without pulling i18n into a schema module.
 */
export const loginSchema = z.object({
  email: z.string().min(1, 'validation.emailRequired'),
  password: z.string().min(1, 'validation.passwordRequired'),
  remember: z.boolean().optional(),
})

export type LoginFormValues = z.infer<typeof loginSchema>
