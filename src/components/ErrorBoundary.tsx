import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** texto mostrado no lugar do conteúdo que falhou */
  message: string
}

/**
 * Pega falhas de renderização, principalmente o download de um pedaço do app (lazy) que falha
 * por falta de rede ou depois de um deploy novo, e oferece recarregar em vez de deixar a tela em branco.
 */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
        <p>{this.props.message}</p>
        <button type="button" className="mt-2 font-medium underline" onClick={() => window.location.reload()}>
          Recarregar
        </button>
      </div>
    )
  }
}
