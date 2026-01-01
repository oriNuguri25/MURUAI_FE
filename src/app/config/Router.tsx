import { createBrowserRouter } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import HomePage from "@/pages/home/HomePage";
import DesignPage from "@/pages/design/DesignPage";
import DesignLayout from "../layout/DesignLayout";
import AuthCallbackPage from "@/pages/auth/AuthCallbackPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
    ],
  },
  {
    path: "/",
    element: <DesignLayout />,
    children: [
      {
        path: "design",
        element: <DesignPage />,
      },
    ],
  },
  {
    path: "/auth/callback",
    element: <AuthCallbackPage />,
  },
]);
