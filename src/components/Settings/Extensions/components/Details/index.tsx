import { useContext, useMemo } from "react";
import { ExtensionsContext, Plugin } from "../..";

const Details = () => {
  const { plugins, activeId } = useContext(ExtensionsContext);

  const findPlugin = (plugins: Plugin[], id: string) => {
    for (const plugin of plugins) {
      const { children = [] } = plugin;

      if (plugin.id === id) {
        return plugin;
      }

      if (children.length > 0) {
        const matched = findPlugin(children, id) as Plugin;

        if (!matched) continue;

        return matched;
      }
    }
  };

  const currentPlugin = useMemo(() => {
    if (!activeId) return;

    return findPlugin(plugins, activeId);
  }, [activeId, plugins]);

  return (
    <div className="flex-1 h-full overflow-auto">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {currentPlugin?.name}
      </h2>

      <div className="pr-4">{currentPlugin?.detail}</div>
    </div>
  );
};

export default Details;
