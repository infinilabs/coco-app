import type { I } from '../index.d';
import SVGWrap from "./SVGWrap";

export default function Retrieve(props: I.SVG) {
  return (
    <SVGWrap {...props} viewBox="0 0 16 16">
      <g
        id="Retrieve"
        stroke="none"
        strokeWidth="1"
        fill="none"
        fillRule="evenodd"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line
          x1="10.8977456"
          y1="14.5"
          x2="14"
          y2="10.9204757"
          id="路径"
          stroke="currentColor"
          strokeWidth="1.25"
          transform="translate(12.4489, 12.7102) scale(-1, 1) translate(-12.4489, -12.7102)"
        ></line>
        <circle
          id="椭圆形"
          stroke="currentColor"
          strokeWidth="1.25"
          transform="translate(7.5, 7) scale(-1, 1) translate(-7.5, -7)"
          cx="7.5"
          cy="7"
          r="5"
        ></circle>
      </g>
    </SVGWrap>
  );
}
