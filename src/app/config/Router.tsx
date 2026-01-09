import { createBrowserRouter } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import HomePage from "@/pages/home/HomePage";
import DesignPage from "@/pages/design/DesignPage";
import DesignLayout from "../layout/DesignLayout";
import AuthCallbackPage from "@/pages/auth/AuthCallbackPage";
import MyDocPage from "@/pages/mydoc/MyDocPage";
import AdminUserDocsPage from "@/pages/admin/AdminUserDocsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "mydoc",
        element: <MyDocPage />,
      },
      {
        path: "admin/user-docs",
        element: <AdminUserDocsPage />,
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
]);
