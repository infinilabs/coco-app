import { Outlet } from "react-router-dom";

import useEscape from "../hooks/useEscape";

export default function Layout() {
  useEscape();

  return <Outlet />;
}
