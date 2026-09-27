import { useEffect } from "react";

export function useGlobalErrorLogger() {
  useEffect(() => {
    // Bắt lỗi đồng bộ
    const handleError = (event: ErrorEvent) => {
      console.error(
        "[Global Error] Message:", event.message,
        "| File:", event.filename,
        "| Line:", event.lineno,
        "| Column:", event.colno,
        "| Error object:", event.error
      );
      event.preventDefault();
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("[Unhandled Promise Rejection] Reason:", event.reason);
      event.preventDefault(); 
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);
}