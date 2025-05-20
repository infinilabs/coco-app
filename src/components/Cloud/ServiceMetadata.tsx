import { memo } from "react";
import { PackageOpen, GitFork, CalendarSync } from "lucide-react";

import { useConnectStore } from "@/stores/connectStore";

interface ServiceMetadataProps {}

const ServiceMetadata = memo(({}: ServiceMetadataProps) => {
  const currentService = useConnectStore((state) => state.currentService);

  return (
    <div className="mb-8">
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-2 flex">
        <span className="flex items-center gap-1">
          <PackageOpen className="w-4 h-4" /> {currentService?.provider?.name}
        </span>
        <span className="mx-4">|</span>
        <span className="flex items-center gap-1">
          <GitFork className="w-4 h-4" /> {currentService?.version?.number}
        </span>
        <span className="mx-4">|</span>
        <span className="flex items-center gap-1">
          <CalendarSync className="w-4 h-4" /> {currentService?.updated}
        </span>
      </div>
      <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
        {currentService?.provider?.description}
      </p>
    </div>
  );
});

export default ServiceMetadata;
