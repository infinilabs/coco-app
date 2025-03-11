import React from "react";
import { useTranslation } from "react-i18next";

import errorImg from "@/assets/error_page.png";

interface ErrorDisplayProps {
  errorMessage?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ errorMessage }) => {
  const { t } = useTranslation();

  return (
    <div className="w-full h-screen bg-white shadow-[0px_16px_32px_0px_rgba(0,0,0,0.4)] rounded-xl border-[2px] border-[#E6E6E6] m-auto">
      <div className="flex flex-col justify-center items-center">
        <img
          src={errorImg}
          alt="error-page"
          className="w-[221px] h-[154px] mb-8 mt-[72px]"
        />
        <div className="w-[380px] h-[46px] px-5 font-normal text-base text-[rgba(0,0,0,0.85)] leading-[25px] text-center mb-4">
          {t('error.message')}
        </div>
        {errorMessage && (
          <div className="w-[380px] h-[45px] font-normal text-[10px] text-[rgba(135,135,135,0.85)] leading-[16px] text-center">
            <i>{errorMessage}</i>
          </div>
        )}
      </div>
    </div>
  );
};
