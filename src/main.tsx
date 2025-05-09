import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { router } from "./routes/index";
import "./i18n";

import "./main.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <RouterProvider router={router} />
);
