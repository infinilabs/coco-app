// import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { router } from "./routes/index";
import "./i18n";

import "./main.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  //<React.StrictMode>
  <RouterProvider router={router} />
  // </React.StrictMode>
);
