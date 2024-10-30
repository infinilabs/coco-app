import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { ThemeProvider } from "./components/ThemeProvider";
import { router } from "./routes/index";

import "./main.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="theme">
      <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>
);
