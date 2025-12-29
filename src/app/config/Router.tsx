import { createBrowserRouter } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import HomePage from "@/pages/home/HomePage";
import DesignPage from "@/pages/design/DesignPage";
import DesignLayout from "../layout/DesignLayout";

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
]);
