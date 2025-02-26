import SVGWrap from "./SVGWrap";

export default function History(props: I.SVG) {
  return (
    <SVGWrap {...props} viewBox="0 0 16 16">
      <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
        <line x1="2.5" y1="2.5" x2="12.5" y2="2.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        <line x1="2.5" y1="5.5" x2="5.5" y2="5.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        <circle stroke="currentColor" strokeWidth="1.25" cx="10.5" cy="9.5" r="3.875" />
        <line x1="2.5" y1="8.5" x2="4.5" y2="8.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        <line x1="2.5" y1="11.5" x2="4.5" y2="11.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        <polyline stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" points="10.5 8 10.5 9.95109336 12.1949416 9.95109336" />
      </g>
    </SVGWrap>
  );
}