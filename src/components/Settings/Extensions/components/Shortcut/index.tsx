import { find, isEmpty, map, remove, some, split } from "lodash-es";
import { useRef, type FC, type KeyboardEvent, type MouseEvent } from "react";
import { type Key, keys, modifierKeys, standardKeys } from "./keyboard";
import { CircleX } from "lucide-react";
import { useFocusWithin, useHover, useReactive } from "ahooks";
import clsx from "clsx";

interface ShortcutProps {
  value?: string;
  placeholder?: string;
  isSystem?: boolean;
  onChange?: (value: string) => void;
}

interface State {
  value: Key[];
}

const Shortcut: FC<ShortcutProps> = (props) => {
  const { value = "", placeholder, isSystem = true, onChange } = props;

  const separator = isSystem ? "+" : ".";
  const keyFiled = isSystem ? "tauriKey" : "hookKey";

  const parseValue = () => {
    if (!value) return [];

    return split(value, separator).map((key) => {
      return find(keys, { [keyFiled]: key })!;
    });
  };

  const state = useReactive<State>({
    value: parseValue(),
  });

  const containerRef = useRef<HTMLDivElement>(null);

  const isHovering = useHover(containerRef);

  const isFocusing = useFocusWithin(containerRef, {
    onFocus: () => {
      state.value = [];
    },
    onBlur: () => {
      if (!isValidShortcut()) {
        state.value = parseValue();
      }

      handleChange();
    },
  });

  const isValidShortcut = () => {
    if (state.value?.[0]?.eventKey?.startsWith("F")) {
      return true;
    }

    const hasModifierKey = some(state.value, ({ eventKey }) => {
      return some(modifierKeys, { eventKey });
    });
    const hasStandardKey = some(state.value, ({ eventKey }) => {
      return some(standardKeys, { eventKey });
    });

    return hasModifierKey && hasStandardKey;
  };

  const getEventKey = (event: KeyboardEvent) => {
    let { key, code } = event;

    key = key.replace("Meta", "Command");

    const isModifierKey = some(modifierKeys, { eventKey: key });

    return isModifierKey ? key : code;
  };

  const handleChange = () => {
    const nextValue = map(state.value, keyFiled).join(separator);

    onChange?.(nextValue);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const eventKey = getEventKey(event);

    const matched = find(keys, { eventKey });
    const isInvalid = !matched;
    const isDuplicate = some(state.value, { eventKey });

    if (isInvalid || isDuplicate) return;

    state.value.push(matched);

    if (isValidShortcut()) {
      containerRef.current?.blur();
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    remove(state.value, { eventKey: getEventKey(event) });
  };

  const handleClear = (event: MouseEvent) => {
    event.preventDefault();

    state.value = [];

    handleChange();
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="relative flex items-center h-6 px-2 rounded-[4px] border border-transparent hover:border-[#0072FF] focus:border-[#0072FF] transition"
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      {isEmpty(state.value) ? (
        <div className="whitespace-nowrap">{placeholder}</div>
      ) : (
        <div className="font-bold text-primary">
          {map(state.value, "symbol").join(" ")}
        </div>
      )}

      <CircleX
        size={16}
        className={clsx(
          "absolute right-2 hover:text-[#0072FF] cursor-pointer transition",
          {
            hidden: isFocusing || !isHovering || isEmpty(state.value),
          }
        )}
        onMouseDown={handleClear}
      />
    </div>
  );
};

export default Shortcut;
