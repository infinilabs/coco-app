import { createBrowserRouter } from "react-router-dom";
import { Suspense, lazy } from "react";

import ErrorPage from "@/pages/error/index";

const WebPage = lazy(() => import("@/pages/web/index"));

const routerOptions = {
  basename: "/",
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
} as const;

export const routerWeb = createBrowserRouter(
  [
    {
      path: "/",
      errorElement: <ErrorPage />,
      element: (
        <Suspense fallback={<></>}>
          <WebPage />
        </Suspense>
      ),
    },
  ],
  routerOptions
);

