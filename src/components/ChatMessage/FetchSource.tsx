import {
  ChevronUp,
  ChevronDown,
  SquareArrowOutUpRight,
  Globe,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { OpenURLWithBrowser } from "@/utils/index";
import type { IChunkData } from "@/components/Assistant/types";
import RetrieveIcon from "@/icons/Retrieve";

interface FetchSourceProps {
  Detail?: any;
  ChunkData?: IChunkData;
  loading?: boolean;
}

interface ISourceData {
  category: string;
  icon: string;
  id: string;
  size: number;
  source: {
    type: string;
    name: string;
    id: string;
  };
  summary: string;
  thumbnail: string;
  title: string;
  updated: string | null;
  url: string;
}

export const FetchSource = ({ Detail, ChunkData, loading }: FetchSourceProps) => {
  const { t } = useTranslation();
  const [isSourceExpanded, setIsSourceExpanded] = useState(false);

  const [total, setTotal] = useState(0);
  const [data, setData] = useState<ISourceData[]>([]);

  useEffect(() => {
    if (!Detail?.payload) return;
    // console.log("Detail?.payload", Detail?.payload);
    setData(Detail?.payload);
    setTotal(Detail?.payload.length);
  }, [Detail?.payload]);

  useEffect(() => {
    if (!ChunkData?.message_chunk) return;

    // console.log("ChunkData?.message_chunk", ChunkData?.message_chunk);

    // "<Payload total=50>\n[{\"icon\":\"web\",\"id\":\"7d5e5639597012df79527861b3e5b0ed\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Console\",\"id\":\"cva0pqehpcencvf37iq0\"},\"title\":\"Alias Management\",\"url\":\"https://docs.infinilabs.com/console/main/docs/reference/data/alias/\"},{\"icon\":\"web\",\"id\":\"3aa1d53093ccee38905376b21933223a\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Labs Blogs\",\"id\":\"cva0p4ehpcencvf37ihg\"},\"title\":\"How We Do Documentation Engineering\",\"url\":\"https://blog.infinilabs.com/posts/2024/how-we-do-product-documentation-engineering/\"},{\"icon\":\"web\",\"id\":\"58548f30ab850dc9522b5cbe81c3e48a\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"Configuring the Gateway\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/getting-started/configuration/\"},{\"icon\":\"web\",\"id\":\"1f6128aeac21919b89c3095111bb3328\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Console\",\"id\":\"cva0pqehpcencvf37iq0\"},\"title\":\"How to monitor slow query requests in Elasticsearch\",\"url\":\"https://docs.infinilabs.com/console/main/docs/tutorials/cluster_slow_request/\"},{\"icon\":\"web\",\"id\":\"898a07b9df4e084b25c4d6e031ee40f2\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Console\",\"id\":\"cva0pqehpcencvf37iq0\"},\"title\":\"Installing Agent\",\"url\":\"https://docs.infinilabs.com/console/main/docs/reference/agent/install/\"},{\"icon\":\"web\",\"id\":\"b652640528d2a20039cbdd18e843cc09\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"Benchmark Testing\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/getting-started/benchmark/\"},{\"icon\":\"web\",\"id\":\"8b9f9914c71b58245074541e05f5aab9\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Loadgen\",\"id\":\"cva0q1uhpcencvf37iu0\"},\"title\":\"Benchmark Testing\",\"url\":\"https://docs.infinilabs.com/loadgen/main/docs/getting-started/benchmark/\"},{\"icon\":\"web\",\"id\":\"0c2f4e1bda1a1d3856db1f70151ce9a7\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"sample\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/references/filters/sample/\"},{\"icon\":\"web\",\"id\":\"82e5e6b8f71eaff0e7085cbd8444dca8\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"retry_limiter\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/references/filters/retry_limiter/\"},{\"icon\":\"web\",\"id\":\"b822087343cc307965b8415e6ffa7adf\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"record\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/references/filters/record/\"},{\"icon\":\"web\",\"id\":\"f71f402c6c4d36d0e577206a9967ad45\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI  Agent\",\"id\":\"cva0qc6hpcencvf37j2g\"},\"title\":\"Installing the Agent\",\"url\":\"https://docs.infinilabs.com/agent/main/docs/getting-started/install/\"},{\"icon\":\"web\",\"id\":\"235417810da23254a51260aae74dd416\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Easysearch\",\"id\":\"cva0sluhpcenecu83dkg\"},\"title\":\"全文查询\",\"url\":\"https://docs.infinilabs.com/easysearch/main/docs/references/search/full-text/\"},{\"icon\":\"web\",\"id\":\"dfa6df363be38d0af56403cc63f0546a\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"clone\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/references/filters/clone/\"},{\"icon\":\"web\",\"id\":\"701b8e19f377d938e59db1cf21d7ef89\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Pizza\",\"id\":\"cva0opuhpcencvf37id0\"},\"title\":\"Avg aggregation\",\"url\":\"https://pizza.rs/docs/references/aggregation/avg/\"},{\"icon\":\"web\",\"id\":\"518ce3145eaccf983e55e1c5d41ac2e0\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"request_method_filter\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/references/filters/request_method_filter/\"},{\"icon\":\"web\",\"id\":\"5c9987f12e3414c6e11a787c806ab327\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"response_status_filter\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/references/filters/response_status_filter/\"},{\"icon\":\"web\",\"id\":\"dd456395c3119e7905e831929d8b4c35\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Labs Blogs\",\"id\":\"cva0p4ehpcencvf37ihg\"},\"title\":\"Build a Vector Extension for Postgres - Vector Type\",\"url\":\"https://blog.infinilabs.com/posts/2024/build_a_vector_extension_for_postgres_vector_type/\"},{\"icon\":\"web\",\"id\":\"9bc518139925e74668c12460e2e8953e\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"json_indexing\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/references/processors/json_indexing/\"},{\"icon\":\"web\",\"id\":\"751b429665ef9fb37704eaa03f4f8720\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"request_user_filter\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/references/filters/request_user_filter/\"},{\"icon\":\"web\",\"id\":\"f8beea7ac2d8321fbefdd651da5f55c6\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"response_header_filter\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/references/filters/response_header_filter/\"},{\"icon\":\"web\",\"id\":\"712c9f93284992e1fb60f6ac802ff0d9\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Console\",\"id\":\"cva0pqehpcencvf37iq0\"},\"title\":\"Docker\",\"url\":\"https://docs.infinilabs.com/console/main/docs/getting-started/docker/\"},{\"icon\":\"web\",\"id\":\"3fa9843a0a84a84c3a4596d56717d40a\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Pizza\",\"id\":\"cva0opuhpcencvf37id0\"},\"title\":\"Fetch a document\",\"url\":\"https://pizza.rs/docs/references/document/fetch/\"},{\"icon\":\"web\",\"id\":\"bbea962a35f484fb421c0199f93ef6f0\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Loadgen\",\"id\":\"cva0q1uhpcencvf37iu0\"},\"title\":\"Installing the Loadgen\",\"url\":\"https://docs.infinilabs.com/loadgen/main/docs/getting-started/install/\"},{\"icon\":\"web\",\"id\":\"fbfb718be9b67719349e6812fbb051ca\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"bulk_response_process\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/references/filters/bulk_response_process/\"},{\"icon\":\"web\",\"id\":\"6d751e2573c1b3aa42c034b90d890807\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"request_header_filter\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/references/filters/request_header_filter/\"},{\"icon\":\"web\",\"id\":\"11e5f53a38d369f0be1840575a034859\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"request_client_ip_filter\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/references/filters/request_client_ip_filter/\"},{\"icon\":\"web\",\"id\":\"2f17d480a4e4fccfd1f33cfa1a659c9f\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"bulk_request_throttle\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/references/filters/bulk_request_throttle/\"},{\"icon\":\"web\",\"id\":\"4e7129e1cbc64648585557bdd9146328\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Console\",\"id\":\"cva0pqehpcencvf37iq0\"},\"title\":\"Alerting Center\",\"url\":\"https://docs.infinilabs.com/console/main/docs/reference/alerting/message/\"},{\"icon\":\"web\",\"id\":\"03d723c4d931a3f45e136984a289e54c\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"flow\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/references/filters/flow/\"},{\"icon\":\"web\",\"id\":\"6d3bfe7a276045ecd10a6d36dc05768a\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Pizza\",\"id\":\"cva0opuhpcencvf37id0\"},\"title\":\"Type Parameter\",\"url\":\"https://pizza.rs/docs/references/types/type_parameter/\"},{\"icon\":\"web\",\"id\":\"b720f16786a266c11d862ea7c4de9cef\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Pizza\",\"id\":\"cva0opuhpcencvf37id0\"},\"title\":\"Value count aggregation\",\"url\":\"https://pizza.rs/docs/references/aggregation/value-count/\"},{\"icon\":\"web\",\"id\":\"f3fbb062bb5a9b46f060b8f2c3a15efa\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"Integrate with Elasticsearch-Hadoop\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/tutorial/es-hadoop_integration/\"},{\"icon\":\"web\",\"id\":\"16ac165196db822f2061b3ff4be389ea\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"request_user_limiter\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/references/filters/request_user_limiter/\"},{\"icon\":\"web\",\"id\":\"b36fc54af4d86162e07fc95f86162cfa\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"request_path_limiter\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/references/filters/request_path_limiter/\"},{\"icon\":\"web\",\"id\":\"135a9465a539022b84019d769477f6c9\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"context_limiter\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/references/filters/context_limiter/\"},{\"icon\":\"web\",\"id\":\"dadd611274bf830b731f4bb7c65cd1fd\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Labs Blogs\",\"id\":\"cva0p4ehpcencvf37ihg\"},\"title\":\"Build a Vector Extension for Postgres - Introduction\",\"url\":\"https://blog.infinilabs.com/posts/2024/build_a_vector_extension_for_postgres_introduction/\"},{\"icon\":\"web\",\"id\":\"d4e9d8565c5c778ca6bb2313e503832d\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"request_path_filter\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/references/filters/request_path_filter/\"},{\"icon\":\"web\",\"id\":\"30189badba174d3d4d5b63707546455b\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"dag\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/references/processors/dag/\"},{\"icon\":\"web\",\"id\":\"b3543c39d34ce7bbd6432592864e057a\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"request_client_ip_limiter\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/references/filters/request_client_ip_limiter/\"},{\"icon\":\"web\",\"id\":\"7213d0df56a6704bd1f684347c6aa207\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"queue_consumer\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/references/processors/queue_consumer/\"},{\"icon\":\"web\",\"id\":\"e5b186035a8f1f3b746a413263ed1136\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"merge_to_bulk\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/references/processors/merge_to_bulk/\"},{\"icon\":\"web\",\"id\":\"62db820d95a599478e3a09639ff217c1\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"http\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/references/filters/http/\"},{\"icon\":\"web\",\"id\":\"6fdefcfbd1e460425c72f9d9ab012fe3\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"dump_hash\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/references/processors/dump_hash/\"},{\"icon\":\"web\",\"id\":\"c68e59de4ee6a3b932dbdb0daa8fd846\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"request_host_limiter\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/references/filters/request_host_limiter/\"},{\"icon\":\"web\",\"id\":\"359591df8d98e262215000094e93544c\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Console\",\"id\":\"cva0pqehpcencvf37iq0\"},\"title\":\"How to easily create an Elasticsearch \\\"guest\\\" user\",\"url\":\"https://docs.infinilabs.com/console/main/docs/tutorials/create_readonly_account/\"},{\"icon\":\"web\",\"id\":\"a7a3a4f9976494957562d59a38fc6c47\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"indexing_merge\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/references/processors/indexing_merge/\"},{\"icon\":\"web\",\"id\":\"75484ce29146b6f372463487026bc394\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"context_filter\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/references/filters/context_filter/\"},{\"icon\":\"web\",\"id\":\"a21415691f0f5113cee97bcabaa2bbaf\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Gateway\",\"id\":\"cva0q8ehpcencvf37j10\"},\"title\":\"Index Segment Merging\",\"url\":\"https://docs.infinilabs.com/gateway/main/docs/references/modules/force_merge/\"},{\"icon\":\"web\",\"id\":\"e029d9c073d92ebbc7cbab0a2ed848a8\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Console\",\"id\":\"cva0pqehpcencvf37iq0\"},\"title\":\"Common Commands\",\"url\":\"https://docs.infinilabs.com/console/main/docs/reference/dev-tools/command/\"},{\"icon\":\"web\",\"id\":\"02bab7ee641f82024612bc26150b83ac\",\"source\":{\"type\":\"connector\",\"name\":\"INFINI Pizza\",\"id\":\"cva0opuhpcencvf37id0\"},\"title\":\"Sum aggregation\",\"url\":\"https://pizza.rs/docs/references/aggregation/sum/\"}]</Payload>"

    if (!loading) { 
      try {
        const match = ChunkData.message_chunk.match(
          // /\u003cPayload total=(\d+)\u003e/
          /<Payload total=(\d+)>/
        );
        if (match) {
          setTotal(Number(match[1]));
        }
  
        // const jsonMatch = ChunkData.message_chunk.match(/\[(.*)\]/s);
        const jsonMatch = ChunkData.message_chunk.match(/\[([\s\S]*)\]/);
        if (jsonMatch) {
          const jsonData = JSON.parse(jsonMatch[0]);
          setData(jsonData);
        }
      } catch (e) {
        console.error("Failed to parse fetch source data:", e);
      }
    }
   
  }, [ChunkData?.message_chunk, loading]);

  // Must be after hooks ！！！
  if (!ChunkData && !Detail) return null;

  return (
    <div
      className={`mt-2 mb-2 w-[610px] ${
        isSourceExpanded
          ? "rounded-lg overflow-hidden border border-[#E6E6E6] dark:border-[#272626]"
          : ""
      }`}
    >
      <button
        onClick={() => setIsSourceExpanded((prev) => !prev)}
        className={`inline-flex justify-between items-center gap-2 px-2 py-1 rounded-xl transition-colors whitespace-nowrap ${
          isSourceExpanded
            ? "w-full"
            : "border border-[#E6E6E6] dark:border-[#272626]"
        }`}
      >
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <RetrieveIcon className="w-4 h-4 text-[#38C200] flex-shrink-0" />
          <span className="text-xs text-[#999999]">
            {t(
              `assistant.message.steps.${ChunkData?.chunk_type || Detail.type}`,
              {
                count: Number(total),
              }
            )}
          </span>
        </div>
        {isSourceExpanded ? (
          <ChevronUp className="w-4 h-4 text-[#999999]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#999999]" />
        )}
      </button>

      {isSourceExpanded && (
        <>
          {/* {prefix && (
            <div className="px-3 py-2 bg-[#F7F7F7] dark:bg-[#1E1E1E] text-[#666666] dark:text-[#A3A3A3] text-xs leading-relaxed border-b border-[#E6E6E6] dark:border-[#272626]">
              {prefix}
            </div>
          )} */}
          {data?.map((item, idx) => (
            <div
              key={idx}
              onClick={() => item.url && OpenURLWithBrowser(item.url)}
              className="group flex items-center p-2 hover:bg-[#F7F7F7] dark:hover:bg-[#2C2C2C] border-b border-[#E6E6E6] dark:border-[#272626] last:border-b-0 cursor-pointer transition-colors"
            >
              <div className="w-full flex items-center gap-2">
                <div className="w-[75%] flex items-center gap-1">
                  <Globe className="w-3 h-3 flex-shrink-0" />
                  <div className="text-xs text-[#333333] dark:text-[#D8D8D8] truncate font-normal group-hover:text-[#0072FF] dark:group-hover:text-[#0072FF]">
                    {item.title || item.category}
                  </div>
                </div>
                <div className="w-[25%] flex items-center justify-end gap-2">
                  <span className="text-xs text-[#999999] dark:text-[#999999] truncate">
                    {item.source?.name}
                  </span>
                  <SquareArrowOutUpRight className="w-3 h-3 text-[#999999] dark:text-[#999999] flex-shrink-0" />
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};
