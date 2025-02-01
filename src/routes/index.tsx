import { createBrowserRouter } from "react-router-dom";

import Layout from "./layout.tsx";
import ErrorPage from "@/error-page";
import SettingsPage from "@/pages/app/settings";
import ChatAI from "@/components/Assistant";
import DesktopApp from "@/pages/app";

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
