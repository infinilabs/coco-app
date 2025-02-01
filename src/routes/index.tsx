import { createBrowserRouter } from "react-router-dom";

import Layout from "./layout.tsx";
// import App from "@/app.tsx";
import ErrorPage from "@/error-page";
import SettingsPage from "@/pages/app/settings";
// import Transition from "@/components/SearchChat/Transition";
import ChatAI from "@/components/ChatAI";
import MySearch from "@/components/MySearch";
import DesktopApp from "@/pages/app";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { path: "/ui", element: <DesktopApp /> },
      { path: "/ui/settings", element: <SettingsPage /> },
      { path: "/ui/chat", element: <ChatAI /> },
      { path: "/ui/search", element: <MySearch /> },
      // { path: "/ui/app", element: <App /> },
    ],
  },
]);
