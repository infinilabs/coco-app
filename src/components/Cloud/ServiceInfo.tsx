import { memo } from "react";

import ServiceBanner from "./ServiceBanner";
import ServiceHeader from "./ServiceHeader";
import ServiceMetadata from "./ServiceMetadata";

interface ServiceInfoProps {
  refreshLoading?: boolean;
  refreshClick: (id: string) => void;
}

const ServiceInfo = memo(
  ({ refreshLoading, refreshClick }: ServiceInfoProps) => {
    return (
      <>
        <ServiceBanner />

        <ServiceHeader
          refreshLoading={refreshLoading}
          refreshClick={refreshClick}
        />

        <ServiceMetadata />
      </>
    );
  }
);

export default ServiceInfo;
