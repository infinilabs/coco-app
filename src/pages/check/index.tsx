import { useEffect } from "react";

import { useUpdateStore } from "@/stores/updateStore";
import UpdateApp from "@/components/UpdateApp";
import { useSyncStore } from "@/hooks/useSyncStore";

const CheckApp = () => {
  const { setVisible } = useUpdateStore();

  useSyncStore();

  useEffect(() => {
    setVisible(true);
  }, []);

  return <UpdateApp isCheckPage />;
};

export default CheckApp;
