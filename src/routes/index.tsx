import { createBrowserRouter } from "react-router-dom";

import Layout from "./Layout";
import App from "@/App";
import ErrorPage from "@/error-page";
import Settings2 from "@/components/Settings/index2";
import SearchChat from "@/components/SearchChat";
import Transition from "@/components/SearchChat/Transition";
import ChatAI from "@/components/ChatAI";
import MySearch from "@/components/MySearch";
import WebApp from "@/pages/web";
import DesktopApp from "@/pages/app";
import Login from "@/pages/login";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { path: "/ui", element: <DesktopApp /> },
      { path: "/ui/old", element: <SearchChat /> },
      { path: "/ui/settings", element: <Settings2 /> },
      { path: "/ui/chat", element: <ChatAI /> },
      { path: "/ui/search", element: <MySearch /> },
      { path: "/ui/transition", element: <Transition /> },
      { path: "/ui/app", element: <App /> },
      { path: "/web", element: <WebApp /> },
      { path: "/login", element: <Login /> },
    ],
  },
]);
