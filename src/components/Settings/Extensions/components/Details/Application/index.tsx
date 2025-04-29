import { FC } from "react";
import { Application } from "@/stores/applicationsStore";
import { filesize } from "filesize";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

interface AppProps {
  current: Application;
}

const App: FC<AppProps> = (props) => {
  const { name, where, size, created, modified, lastOpened } = props.current;
  const { t } = useTranslation();

  const metadata = [
    {
      label: t("settings.extensions.application.details.name"),
      value: name,
    },
    {
      label: t("settings.extensions.application.details.where"),
      value: where,
    },
    {
      label: t("settings.extensions.application.details.type"),
      value: t("settings.extensions.application.details.typeValue"),
    },
    {
      label: t("settings.extensions.application.details.size"),
      value: filesize(size, { standard: "jedec", spacer: "" }),
    },
    {
      label: t("settings.extensions.application.details.created"),
      value: dayjs(created).format("YYYY/MM/DD HH:mm:ss"),
    },
    {
      label: t("settings.extensions.application.details.modified"),
      value: dayjs(modified).format("YYYY/MM/DD HH:mm:ss"),
    },
    {
      label: t("settings.extensions.application.details.lastOpened"),
      value: dayjs(lastOpened).format("YYYY/MM/DD HH:mm:ss"),
    },
  ];

  return (
    <ul className="flex flex-col gap-2 p-0">
      {metadata.map((item) => {
        const { label, value } = item;

        return (
          <li
            key={label}
            className="flex items-center justify-between gap-2 text-[13px]"
          >
            <span className="opacity-70">{label}</span>
            <span className="truncate max-w-[240px]">{value}</span>
          </li>
        );
      })}
    </ul>
  );
};

export default App;
