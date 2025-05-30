import { Select, SelectProps } from "@headlessui/react";
import clsx from "clsx";
import { isArray } from "lodash-es";
import { ChevronDownIcon } from "lucide-react";
import { FC } from "react";

interface SettingsSelectProProps extends SelectProps {
  data?: any[];
  labelField?: string;
  valueField?: string;
  rootClassName?: string;
  selectClassName?: string;
}

const SettingsSelectPro: FC<SettingsSelectProProps> = (props) => {
  const {
    data,
    labelField = "name",
    valueField = "id",
    rootClassName,
    selectClassName,
    children,
    ...rest
  } = props;

  const renderOptions = () => {
    if (isArray(data)) {
      return data.map((item) => {
        return (
          <option key={item?.[valueField]} value={item?.[valueField]}>
            {item?.[labelField]}
          </option>
        );
      });
    }

    return children;
  };

  return (
    <div
      className={clsx(
        "relative flex items-center h-8 px-2 border rounded-md",
        rootClassName
      )}
    >
      <Select
        {...rest}
        className={clsx(
          "appearance-none size-full pr-4 bg-transparent",
          selectClassName
        )}
      >
        {renderOptions()}
      </Select>

      <ChevronDownIcon className="absolute size-4 right-2 pointer-events-none" />
    </div>
  );
};

export default SettingsSelectPro;
