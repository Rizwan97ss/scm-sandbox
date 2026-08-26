import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import i18n from '@/i18n'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-svh flex-col items-center justify-center gap-4 bg-background px-4 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <div>
            <h1 className="text-xl font-semibold">{i18n.t('feedback.somethingWentWrong')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{i18n.t('feedback.somethingWentWrongDescription')}</p>
          </div>
          <Button onClick={() => window.location.reload()}>{i18n.t('feedback.reloadPage')}</Button>
        </div>
      )
    }

    return this.props.children
  }
}
