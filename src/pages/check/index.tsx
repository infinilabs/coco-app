import { useEffect } from "react";

import { useUpdateStore } from "@/stores/updateStore";
import UpdateApp from "@/components/UpdateApp";

const CheckApp = () => {
  const { setVisible } = useUpdateStore();

  useEffect(() => {
    setVisible(true);
  }, []);

  return <UpdateApp isCheckPage />;
};

export default CheckApp;
