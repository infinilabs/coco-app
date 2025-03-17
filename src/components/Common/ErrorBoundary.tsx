import { Component, ErrorInfo, ReactNode } from "react";

import { ErrorDisplay } from "@/components/Common/ErrorDisplay";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

class ErrorBoundaryClass extends Component<
  Props & { onError: (error: Error, errorInfo: ErrorInfo) => void }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <ErrorDisplay errorMessage={this.state.error?.message} />
        )
      );
    }
    return this.props.children;
  }
}

const ErrorBoundary = ({ children, fallback }: Props) => {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    console.error("Uncaught error:", error, errorInfo);
  };

  return (
    <ErrorBoundaryClass onError={handleError} fallback={fallback}>
      {children}
    </ErrorBoundaryClass>
  );
};

export default ErrorBoundary;
