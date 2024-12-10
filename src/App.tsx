import { useTranslation } from "react-i18next";

import "./i18n";
import CommandInput from "./components/CommandInput";

function App() {
  const { t } = useTranslation();

  return (
    <div
      className={`
        bg-background
        w-screen h-screen
      `}
    >
      <main className="w-[100%] h-[100%] flex flex-col items-center justify-center">
        <div className="text-xl text-primary">{t("welcome")}</div>

        <div className="mx-0 mt-5 w-[100%]">
          <CommandInput />
        </div>
      </main>
    </div>
  );
}

export default App;
