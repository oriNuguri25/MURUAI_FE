import { RouterProvider } from "react-router-dom";
import { router } from "../config/Router";

export const AppRouterProvider = () => {
  return <RouterProvider router={router} />;
};
