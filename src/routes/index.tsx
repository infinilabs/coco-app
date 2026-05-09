import { createBrowserRouter } from "react-router-dom";
import { Suspense, lazy } from "react";

import Layout from "./layout";
import ErrorPage from "@/pages/error/index";

const DesktopApp = lazy(() => import("@/pages/main/index"));
const SettingsPage = lazy(() => import("@/pages/settings/index"));
const StandaloneChat = lazy(() => import("@/pages/chat/index"));
const CheckPage = lazy(() => import("@/pages/check/index"));
const SelectionWindow = lazy(() => import("@/pages/selection/index"));

const routerOptions = {
  basename: "/",
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
} as const;

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <Layout />,
      errorElement: <ErrorPage />,
      children: [
        { path: "/ui", element: (<Suspense fallback={<></>}><DesktopApp /></Suspense>) },
        { path: "/ui/settings", element: (<Suspense fallback={<></>}><SettingsPage /></Suspense>) },
        { path: "/ui/chat", element: (<Suspense fallback={<></>}><StandaloneChat /></Suspense>) },
        { path: "/ui/check", element: (<Suspense fallback={<></>}><CheckPage /></Suspense>) },
        { path: "/ui/selection", element: (<Suspense fallback={<></>}><SelectionWindow /></Suspense>) },
      ],
    },
  ],
  routerOptions
);
