import loadingSvg from "./loading.svg";
import loadFailedSvg from "./load-failed.svg";

interface DeepResearchLoadingStateProps {
  label: string;
  variant?: "loading" | "failed";
}

export const DeepResearchLoadingState = ({
  label,
  variant = "loading",
}: DeepResearchLoadingStateProps) => {
  const imageSrc = variant === "failed" ? loadFailedSvg : loadingSvg;

  return (
    <div className="flex h-full min-h-[420px] w-full flex-col items-center justify-center px-6 text-center">
      <img
        src={imageSrc}
        alt=""
        className="mb-4 h-[80px] w-[80px] select-none"
      />
      <div className="text-[14px] leading-5 font-medium text-[#A3A3A3]">
        {label}
      </div>
    </div>
  );
};
