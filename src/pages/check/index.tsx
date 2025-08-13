import UpdateApp from "@/components/UpdateApp";
import { useSyncStore } from "@/hooks/useSyncStore";

const CheckApp = () => {
  useSyncStore();

  return <UpdateApp isCheckPage />;
};

export default CheckApp;
