import { AttachmentHit, getAttachment } from "@/api/attachment";
import { useConnectStore } from "@/stores/connectStore";
import { useEffect, useState } from "react";

interface SessionFileProps {
  sessionId: string;
}

const SessionFile = (props: SessionFileProps) => {
  const { sessionId } = props;
  const currentService = useConnectStore((state) => state.currentService);
  const [uploadedFiles, setUploadedFiles] = useState<AttachmentHit[]>([]);

  useEffect(() => {
    getUploadedFiles();
  }, [sessionId]);

  const getUploadedFiles = async () => {
    const serverId = currentService.id;

    setUploadedFiles([]);

    const response = await getAttachment({ serverId, sessionId });

    console.log("response", response);

    setUploadedFiles(response.hits.hits);
  };

  return <div>SessionFile</div>;
};

export default SessionFile;
