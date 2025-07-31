import type { I } from '../index.d';
import SVGWrap from "./SVGWrap";

export default function History(props: I.SVG) {
  return (
    <SVGWrap {...props} viewBox="0 0 16 16">
      <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
        <line
          x1="2.5"
          y1="2"
          x2="13.5"
          y2="2"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
        <circle
          stroke="currentColor"
          strokeWidth="1.25"
          cx="10"
          cy="10"
          r="4.375"
        />
        <line
          x1="2.5"
          y1="8"
          x2="3.5"
          y2="8"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
        <line
          x1="2.5"
          y1="5"
          x2="6"
          y2="5"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
        <line
          x1="2.5"
          y1="11"
          x2="3.5"
          y2="11"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
        <line
          x1="2.5"
          y1="14"
          x2="5"
          y2="14"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
        <polyline
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          points="10 8.33333333 10 10.5012148 11.8832684 10.5012148"
        />
      </g>
    </SVGWrap>
  );
}