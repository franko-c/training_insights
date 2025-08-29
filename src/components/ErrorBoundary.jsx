import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Dashboard error:', error, errorInfo)
    
    // Report error to debugging console if available
    if (window.debugLog) {
      window.debugLog.error('ErrorBoundary caught error:', {
        error: error.message,
        stack: error.stack,
        errorInfo
      })
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
  if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
            <div className="text-red-500 text-2xl mb-4">🚫</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-6">
              The dashboard encountered an unexpected error. You can try reloading or report this issue.
            </p>
            <div className="space-y-2">
              <button 
                onClick={this.handleRetry}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors mb-2"
              >
                Try Again
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
              >
                Reload Dashboard
              </button>
            </div>
            {this.state.error && (
              <details open className="mt-4 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer">Error Details</summary>
                <pre className="text-xs bg-gray-100 p-2 mt-2 rounded overflow-auto text-left">
                  {this.state.error && this.state.error.toString()}
                  {this.state.error && this.state.error.stack && ('\n\n' + this.state.error.stack)}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
