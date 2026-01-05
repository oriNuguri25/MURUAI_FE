import { createBrowserRouter } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import HomePage from "@/pages/home/HomePage";
import DesignPage from "@/pages/design/DesignPage";
import DesignLayout from "../layout/DesignLayout";
import AuthCallbackPage from "@/pages/auth/AuthCallbackPage";
import MyDocPage from "@/pages/mydoc/MyDocPage";

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
      {
        path: "design/:sessionId",
        element: <DesignPage />,
      },
    ],
  },
  {
    path: "/auth/callback",
    element: <AuthCallbackPage />,
  },
  {
    path: "/mydoc",
    element: <MyDocPage />,
  },
]);
