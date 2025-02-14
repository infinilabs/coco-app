import SVGWrap from "./SVGWrap";

export default function Stop(props: I.SVG) {
  return (
    <SVGWrap viewBox="0 0 16 16" {...props}>
     <g id="输入区域融合" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g id="搜索结果" transform="translate(-1324, -770)" fill="#FFFFFF" fill-rule="nonzero">
            <g id="停止" transform="translate(1324, 770)">
                <rect id="矩形" opacity="0" x="0" y="0" width="16" height="16"></rect>
                <path d="M4.64003125,12.7998906 L11.360125,12.7998906 C12.1554063,12.7998906 12.8,12.1552969 12.8,11.3600156 L12.8,4.64 C12.8,3.84475 12.1554375,3.2 11.360125,3.2 L4.64003125,3.2 C3.84476562,3.2 3.20003125,3.84475 3.20003125,4.64 L3.20003125,11.36 C3.20003125,12.15525 3.84473437,12.7998906 4.64003125,12.7998906 L4.64003125,12.7998906 Z" id="路径"></path>
            </g>
        </g>
    </g>
    </SVGWrap>
  );
}
