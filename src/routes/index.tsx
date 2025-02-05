import { createBrowserRouter } from "react-router-dom";

import Layout from "./layout.tsx";
import ErrorPage from "@/error-page";
import DesktopApp from "@/pages/main/index.tsx";
import SettingsPage from "@/pages/settings/index.tsx";
import ChatAI from "@/components/Assistant";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { path: "/ui", element: <DesktopApp /> },
      { path: "/ui/settings", element: <SettingsPage /> },
      { path: "/ui/app/chat", element: <ChatAI /> },
    ],
  },
]);
