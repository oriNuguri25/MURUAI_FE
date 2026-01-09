import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "../config/Router";
import { AuthProvider } from "@/shared/providers/AuthProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5분간 데이터를 신선하게 유지
      gcTime: 1000 * 60 * 30, // 30분간 캐시 보관
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const AppRouterProvider = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  );
};
