"use client";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTheme } from "@/components/theme-provider";

export function AppToaster() {
  const { theme } = useTheme();

  return (
    <ToastContainer
      position="bottom-right"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      pauseOnHover
      theme={theme}
      className="certiflow-toast-container"
      toastClassName="certiflow-toast"
      bodyClassName="certiflow-toast-body"
    />
  );
}
