import SVGWrap from "./SVGWrap";

export default function WindowsFull(props: I.SVG) {
  return (
    <SVGWrap {...props} viewBox="0 0 16 16">
      <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
        <path
          d="M6.03401908,13.5 L2,13.5 L2,2.5 L14,2.5 L14,6.97747296"
          stroke="currentColor"
          strokeWidth="1.25"
        />
        <line
          x1="7.31367179"
          y1="7.77938294"
          x2="5.24537408"
          y2="5.71108522"
          stroke="currentColor"
          strokeWidth="1.25"
        />
        <path
          d="M4.41423772,7.80786873 L4.41423772,4.80786873 L7.41423772,4.80786873"
          stroke="currentColor"
          strokeWidth="1.25"
        />
        <rect
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          x="9"
          y="9.5"
          width="5"
          height="4"
        />
      </g>
    </SVGWrap>
  );
}