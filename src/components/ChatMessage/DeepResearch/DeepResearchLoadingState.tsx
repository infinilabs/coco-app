import loadingSvg from "./loading.svg";

interface DeepResearchLoadingStateProps {
  label: string;
}

export const DeepResearchLoadingState = ({
  label,
}: DeepResearchLoadingStateProps) => {
  return (
    <div className="flex h-full min-h-[420px] w-full flex-col items-center justify-center px-6 text-center">
      <img
        src={loadingSvg}
        alt=""
        className="mb-4 h-[72px] w-[72px] select-none"
      />
      <div className="text-[14px] leading-5 font-medium text-[#A3A3A3]">
        {label}
      </div>
    </div>
  );
};
