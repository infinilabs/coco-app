import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import platformAdapter from "@/utils/platformAdapter";
import { router } from "./routes/index";
import { routerWeb } from "./routes/web";
import "./i18n";
import '@/utils/global-logger';

import "./main.css";

const isTauri = platformAdapter.isTauri();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <RouterProvider router={isTauri ? router : routerWeb} />
);
