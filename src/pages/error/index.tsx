import { useRouteError } from "react-router-dom";

import { ErrorDisplay } from "@/components/Common/ErrorDisplay";

export default function ErrorPage() {
  const error: any = useRouteError();
  console.error(error);

  return <ErrorDisplay errorMessage={error.statusText || error.message} />;
}
