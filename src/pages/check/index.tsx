import { useEffect } from "react";

import { useUpdateStore } from "@/stores/updateStore";
import UpdateApp from "@/components/UpdateApp";

const CheckApp = () => {
  const setVisible = useUpdateStore((state) => state.setVisible);

  useEffect(() => {
    setVisible(true)
  }, [])

  return (
    <div>
      <UpdateApp isCheckPage={true} />
    </div>
  );
};

export default CheckApp;