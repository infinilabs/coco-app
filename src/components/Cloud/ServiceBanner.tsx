import { memo } from "react";

import bannerImg from "@/assets/images/coco-cloud-banner.jpeg";
import { useConnectStore } from "@/stores/connectStore";

interface ServiceBannerProps {}

const ServiceBanner = memo(({}: ServiceBannerProps) => {
  const currentService = useConnectStore((state) => state.currentService);

  return (
    <div className="w-full rounded-[4px] bg-[rgba(229,229,229,1)] dark:bg-gray-800 mb-6">
      <img
        width="100%"
        src={currentService?.provider?.banner || bannerImg}
        alt="banner"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = bannerImg;
        }}
      />
    </div>
  );
});

export default ServiceBanner;
