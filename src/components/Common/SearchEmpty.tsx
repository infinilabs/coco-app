import { useThemeStore } from "@/stores/themeStore";
import { FC } from "react";
import { useTranslation } from "react-i18next";

interface SearchEmptyProps {
  width?: number;
  height?: number;
}

const SearchEmpty: FC<SearchEmptyProps> = (props) => {
  const { width = 108, height } = props;
  const { isDark } = useThemeStore();
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        width={width}
        height={height}
        viewBox="0 0 110 74"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
      >
        <title>编组 7</title>
        <g
          id="插件商店"
          stroke="none"
          strokeWidth="1"
          fill="none"
          fillRule="evenodd"
        >
          <g
            id="无结果"
            transform="translate(-285, -238)"
            stroke={isDark ? "#666" : "#999"}
            strokeWidth="2"
          >
            <g id="编组-7" transform="translate(286.0008, 239)">
              <path
                d="M13.3231659,21.5136996 C13.3231659,19.3007352 13.3231659,14.8686653 13.3231659,8.21749008 C13.3231659,3.67909563 17.0122442,0 21.5629529,0 L88.2118384,0 C92.7625471,0 96.4516254,3.67909563 96.4516254,8.21749008 C96.4516254,10.094192 96.4516254,11.5017184 96.4516254,12.4400693 M96.4516254,51.9326386 C96.4516254,53.9261881 96.4516254,57.8761452 96.4516254,63.7825099 C96.4516254,68.3209044 92.7625471,72 88.2118384,72 L21.5629529,72 C17.0122442,72 13.3231659,68.3209044 13.3231659,63.7825099 L13.3231659,60.938714"
                id="形状"
                strokeDasharray="7,3"
              ></path>
              <ellipse
                id="椭圆形备份"
                cx="81.1877607"
                cy="29.2037781"
                rx="18.4438929"
                ry="18.182295"
              ></ellipse>
              <line
                x1="94.7817074"
                y1="42.614832"
                x2="108"
                y2="55.6552859"
                id="路径-4备份"
                strokeLinecap="round"
              ></line>
              <path
                d="M10.5844571,27.5074364 C16.6773969,25.9924085 23.1773619,29.6710245 27.386048,36.2620174 C22.1657703,35.1830338 16.8575124,35.21291 11.6484221,36.5081661 C7.41338948,37.5612222 3.51420993,39.3834599 -0.000291581531,41.8525859 C0.923937746,34.6468262 4.82125546,28.9404773 10.5844571,27.5074364 Z"
                id="形状结合备份-7"
                strokeLinejoin="round"
              ></path>
              <path
                d="M37.8969953,26.1959104 C43.5101629,25.7114352 48.6739265,29.2024386 51.2337447,34.5954621 C47.1674647,33.4803904 42.8983353,33.0573353 38.538847,33.4336049 C34.1798035,33.8098457 30.0503934,34.9576309 26.2420368,36.7514978 C27.813275,31.0027019 32.2840091,26.6803824 37.8969953,26.1959104 Z"
                id="形状结合备份-8"
                strokeLinejoin="round"
              ></path>
              <path
                d="M31.539458,18.2001402 C36.5615365,15.6541096 42.6600468,16.9613729 47.0591458,21.0046327 C42.8699689,21.4911269 38.7533829,22.6937278 34.8532022,24.6709927 C30.9523581,26.6486264 27.5543743,29.2560064 24.6969024,32.3425899 C23.9951662,26.4249906 26.5167961,20.7465085 31.539458,18.2001402 Z"
                id="形状结合备份-11"
                strokeLinejoin="round"
                transform="translate(35.821, 24.6183) rotate(-12) translate(-35.821, -24.6183)"
              ></path>
              <path
                d="M10.5436753,41.4266578 C14.7331796,36.1358502 21.2661914,34.5295217 27.1728604,36.6822627 C23.0525507,39.325329 19.2570765,42.737484 15.9487291,46.9155032 C12.640202,51.0937495 10.0569324,55.7372814 8.18485826,60.662697 C5.65340555,54.2465445 6.3541482,46.7174943 10.5436753,41.4266578 Z"
                id="形状结合备份-9"
                strokeLinejoin="round"
              ></path>
              <path
                d="M26.9124079,37.8021241 C31.7762268,33.9875103 38.3818206,33.4524199 44.0035888,37.0544707 C49.6980215,40.7030801 52.8264479,47.5991177 52.5343362,54.4887727 C49.1502233,50.435903 45.1867531,46.8795531 40.6898778,43.9982579 C36.1927406,41.116795 31.4857464,39.1178133 26.7239231,37.952533 Z"
                id="形状结合备份-10"
                strokeLinejoin="round"
              ></path>
              <path
                d="M25.2800001,38.5113791 C28.9578107,48.5878922 28.4367035,59.4047936 23.7166785,70.9620834"
                id="路径-7备份-2"
              ></path>
              <path
                d="M29.8677805,38.5132245 C35.0745191,48.0589279 36.9874556,58.8758293 35.60659,70.9639287"
                id="路径-7备份-3"
              ></path>
              <line
                x1="28.2081316"
                y1="51.976707"
                x2="30.2418038"
                y2="51.976707"
                id="路径-2"
              ></line>
              <line
                x1="28.2081316"
                y1="57.0471296"
                x2="31.2586399"
                y2="57.0471296"
                id="路径-2备份"
              ></line>
            </g>
          </g>
        </g>
      </svg>

      <span className="text-sm text-[#999]">{t("search.main.noResults")}</span>
    </div>
  );
};

export default SearchEmpty;
