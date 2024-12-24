import { useRouteError } from "react-router-dom";

export default function ErrorPage() {
  const error: any = useRouteError();
  console.error(error);

  return (
    <div id="error-page">
      <div className="error-content">
        <h1 className="error-title">Oops!</h1>
        <p className="error-message">
          Sorry, there is an error in your Coco App. Please contact the administrator.
        </p>
        <p className="error-details">
          <i>{error.statusText || error.message}</i>
        </p>
      </div>
    </div>
  );
}
