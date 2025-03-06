import { createBrowserRouter } from "react-router-dom";

import Layout from "./layout";
import ErrorPage from "@/error-page";
import DesktopApp from "@/pages/main/index";
import SettingsPage from "@/pages/settings/index";
import ChatAI from "@/pages/chat/index";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { path: "/ui", element: <DesktopApp /> },
      { path: "/ui/settings", element: <SettingsPage /> },
      { path: "/ui/chat", element: <ChatAI /> },
    ],
  },
]);
