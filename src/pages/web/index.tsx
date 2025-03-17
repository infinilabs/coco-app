import { useCallback } from "react";

import SearchChat from "./SearchChat";

function WebApp() {
  const querySearch = useCallback(async (input: string) => {
    console.log(input);
  }, []);

  const queryDocuments = useCallback(
    async (from: number, size: number, queryStrings: any) => {
      console.log(from, size, queryStrings);
    },
    []
  );

  return (
    <div className="w-[680px] h-[590px]">
      <SearchChat querySearch={querySearch} queryDocuments={queryDocuments} />
    </div>
  );
}

export default WebApp;
