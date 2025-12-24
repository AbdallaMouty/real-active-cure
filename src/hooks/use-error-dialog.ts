import React, { useState } from "react";
import ErrorDialog from "@/components/ui/error-dialog";

interface ErrorState {
  isOpen: boolean;
  title?: string;
  message: string;
  variant?: "error" | "warning" | "info" | "success";
}

export const useErrorDialog = () => {
  const [errorState, setErrorState] = useState<ErrorState>({
    isOpen: false,
    message: "",
  });

  const showError = (message: string, title?: string) => {
    setErrorState({
      isOpen: true,
      message,
      title,
      variant: "error",
    });
  };

  const showWarning = (message: string, title?: string) => {
    setErrorState({
      isOpen: true,
      message,
      title,
      variant: "warning",
    });
  };

  const showInfo = (message: string, title?: string) => {
    setErrorState({
      isOpen: true,
      message,
      title,
      variant: "info",
    });
  };

  const showSuccess = (message: string, title?: string) => {
    setErrorState({
      isOpen: true,
      message,
      title,
      variant: "success",
    });
  };

  const closeDialog = () => {
    setErrorState((prev) => ({ ...prev, isOpen: false }));
  };

  const ErrorDialogComponent = () => {
    return React.createElement(
      ErrorDialog,
      {
        isOpen: errorState.isOpen,
        onClose: closeDialog,
        title: errorState.title,
        message: errorState.message,
        variant: errorState.variant,
      }
    );
  };

  return {
    showError,
    showWarning,
    showInfo,
    showSuccess,
    closeDialog,
    ErrorDialogComponent,
  };
};