import { memo } from "react";

import ServiceBanner from "./ServiceBanner";
import ServiceHeader from "./ServiceHeader";
import ServiceMetadata from "./ServiceMetadata";

interface ServiceInfoProps {
  refreshLoading?: boolean;
  refreshClick: (id: string) => void;
  fetchServers: (force: boolean) => Promise<void>;
}

const ServiceInfo = memo(
  ({ refreshLoading, refreshClick, fetchServers }: ServiceInfoProps) => {
    return (
      <>
        <ServiceBanner />

        <ServiceHeader
          refreshLoading={refreshLoading}
          refreshClick={refreshClick}
          fetchServers={fetchServers}
        />

        <ServiceMetadata />
      </>
    );
  }
);

export default ServiceInfo;
