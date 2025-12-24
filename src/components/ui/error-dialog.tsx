import { AlertCircle, X } from "lucide-react";
import { Button } from "./button";

interface ErrorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  variant?: "error" | "warning" | "info" | "success";
}

const ErrorDialog = ({
  isOpen,
  onClose,
  title,
  message,
  variant = "error",
}: ErrorDialogProps) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case "error":
        return {
          bg: "bg-red-500",
          icon: "text-white",
          title: "text-white",
          button: "bg-red-600 hover:bg-red-700 text-white",
        };
      case "warning":
        return {
          bg: "bg-yellow-500",
          icon: "text-white",
          title: "text-white",
          button: "bg-yellow-600 hover:bg-yellow-700 text-white",
        };
      case "info":
        return {
          bg: "bg-blue-500",
          icon: "text-white",
          title: "text-white",
          button: "bg-blue-600 hover:bg-blue-700 text-white",
        };
      case "success":
        return {
          bg: "bg-green-500",
          icon: "text-white",
          title: "text-white",
          button: "bg-green-600 hover:bg-green-700 text-white",
        };
      default:
        return {
          bg: "bg-red-500",
          icon: "text-white",
          title: "text-white",
          button: "bg-red-600 hover:bg-red-700 text-white",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className={`w-full max-w-md rounded-lg ${styles.bg} p-6 shadow-lg`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className={`h-6 w-6 ${styles.icon}`} />
            <div>
              <h3 className={`text-lg font-semibold ${styles.title}`}>
                {title || (variant === "error" ? "Error" : variant === "warning" ? "Warning" : variant === "info" ? "Info" : "Success")}
              </h3>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20 p-1 h-auto">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-3 text-white/90 text-sm leading-relaxed">{message}</p>
        <div className="mt-6 flex justify-end">
          <Button
            onClick={onClose}
            className={`${styles.button} rounded-lg px-4 py-2`}>
            OK
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ErrorDialog;