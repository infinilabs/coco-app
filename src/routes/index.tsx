import { createBrowserRouter } from "react-router-dom";

import Layout from "./layout";
import ErrorPage from "@/pages/error/index";
import DesktopApp from "@/pages/main/index";
import SettingsPage from "@/pages/settings/index";
import StandaloneChat from "@/pages/chat/index";
import WebPage from "@/pages/web/index";
import CheckPage from "@/pages/check/index";

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
        { path: "/ui", element: <DesktopApp /> },
        { path: "/ui/settings", element: <SettingsPage /> },
        { path: "/ui/chat", element: <StandaloneChat /> },
        { path: "/ui/check", element: <CheckPage /> },
        { path: "/web", element: <WebPage /> },
      ],
    },
  ],
  routerOptions
);
