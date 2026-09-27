const fs = require('fs');

let appTsx = fs.readFileSync('apps/admin-web/src/App.tsx', 'utf8');

if (!appTsx.includes('class ErrorBoundary')) {
  const errorBoundaryCode = `
import React, { Component, ErrorInfo } from 'react';
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error("Uncaught error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '50px', backgroundColor: '#FEE2E2', color: '#991B1B', height: '100vh' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Something went wrong.</h1>
          <pre style={{ marginTop: '20px', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
            {this.state.error && this.state.error.toString()}
          </pre>
          <pre style={{ marginTop: '20px', whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontSize: '12px' }}>
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
`;

  appTsx = appTsx.replace("import React from 'react';", errorBoundaryCode);
  appTsx = appTsx.replace("<BrowserRouter>", "<ErrorBoundary><BrowserRouter>");
  appTsx = appTsx.replace("</BrowserRouter>", "</BrowserRouter></ErrorBoundary>");

  fs.writeFileSync('apps/admin-web/src/App.tsx', appTsx);
  console.log('ErrorBoundary injected');
} else {
  console.log('ErrorBoundary already exists');
}
