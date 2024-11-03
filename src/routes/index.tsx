import { createBrowserRouter } from "react-router-dom";

// import App from "../App";
import ErrorPage from "../error-page";
// import Settings from "../components/Settings";
import Settings2 from "../components/Settings/index2";
import SearchChat from "../components/SearchChat";
// import ChatAI from "../components/ChatAI";
import MySearch from "../components/MySearch";
import Layout from "./Layout";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { path: "/", element: <SearchChat /> },
      { path: "/settings", element: <Settings2 /> },
      // { path: "/chat", element: <ChatAI /> },
      { path: "/my", element: <MySearch /> },
    ],
  },
]);
