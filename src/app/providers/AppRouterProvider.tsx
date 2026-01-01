import { RouterProvider } from "react-router-dom";
import { router } from "../config/Router";
import { AuthProvider } from "@/shared/providers/AuthProvider";

export const AppRouterProvider = () => {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
};
