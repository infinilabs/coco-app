import { useRouteError } from "react-router-dom";

import errorImg from "./assets/error_page.png";
import ApiDetails from "@/components/Search/ApiDetails";

export default function ErrorPage() {
  const error: any = useRouteError();
  console.error(error);

  return (
    <div className="w-full h-screen bg-white shadow-[0px_16px_32px_0px_rgba(0,0,0,0.4)] rounded-xl border-[2px] border-[#E6E6E6] m-auto">
      <div className="flex flex-col justify-center items-center">
        <img
          src={errorImg}
          alt="error-page"
          className="w-[221px] h-[154px] mb-8 mt-[72px]"
        />
        <div className="w-[380px] h-[46px] px-5 font-normal text-base text-[rgba(0,0,0,0.85)] leading-[25px] text-center mb-4">
          Sorry, there is an error in your Coco App. Please contact the
          administrator.
        </div>
        <div className="w-[380px] h-[45px] font-normal text-[10px] text-[rgba(135,135,135,0.85)] leading-[16px] text-center">
          <i>{error.statusText || error.message}</i>
        </div>
      </div>

      <ApiDetails />
    </div>
  );

  return (
    <div id="error-page">
      <div className="error-content">
        <h1 className="error-title">Oops!</h1>
        <p className="error-message">
          Sorry, there is an error in your Coco App. Please contact the
          administrator.
        </p>
        <p className="error-details">
          <i>{error.statusText || error.message}</i>
        </p>
      </div>
    </div>
  );
}
