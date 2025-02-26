import SVGWrap from "./SVGWrap";

export default function Server(props: I.SVG) {
  return (
    <SVGWrap {...props} viewBox="0 0 16 16">
      <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
        <g transform="translate(2, 2)" stroke="currentColor" strokeWidth="1.25">
          <rect x="0" y="0" width="12" height="4.8" rx="1.2" />
          <rect x="0" y="7.2" width="12" height="4.8" rx="1.2" />
          <line x1="2.4" y1="2.4" x2="2.406" y2="2.4" />
          <line x1="2.4" y1="9.6" x2="2.406" y2="9.6" />
        </g>
      </g>
    </SVGWrap>
  );
}