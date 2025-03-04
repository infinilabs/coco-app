import SVGWrap from "./SVGWrap";

export default function Selection(props: I.SVG) {
  return (
    <SVGWrap {...props} viewBox="0 0 16 16">
      <g
        id="selection"
        stroke="none"
        stroke-width="1"
        fill="none"
        fill-rule="evenodd"
      >
        <g
          id="编组"
          transform="translate(1.4813, 1)"
          stroke="currentColor"
          stroke-width="1.25"
        >
          <line
            x1="6.7986538"
            y1="2.8"
            x2="6.7986538"
            y2="2.07241631e-17"
            id="路径"
            stroke-linecap="round"
            stroke-linejoin="round"
          ></line>
          <circle
            id="椭圆形"
            fill="#000000"
            cx="6.7986538"
            cy="6.72"
            r="1"
          ></circle>
          <line
            x1="2.17440858e-17"
            y1="13.5186538"
            x2="4.62042688"
            y2="8.89822692"
            id="路径"
            stroke-linecap="round"
            stroke-linejoin="round"
          ></line>
          <line
            x1="10.1008425"
            y1="4.16781133"
            x2="10.1008425"
            y2="2.66781133"
            id="路径"
            stroke-linecap="round"
            stroke-linejoin="round"
            transform="translate(10.1008, 3.4178) rotate(45) translate(-10.1008, -3.4178)"
          ></line>
          <line
            x1="12.1186538"
            y1="8.12"
            x2="12.1186538"
            y2="5.32"
            id="路径"
            stroke-linecap="round"
            stroke-linejoin="round"
            transform="translate(12.1187, 6.72) rotate(90) translate(-12.1187, -6.72)"
          ></line>
          <line
            x1="10.1008425"
            y1="10.7721887"
            x2="10.1008425"
            y2="9.27218867"
            id="路径"
            stroke-linecap="round"
            stroke-linejoin="round"
            transform="translate(10.1008, 10.0222) rotate(135) translate(-10.1008, -10.0222)"
          ></line>
          <line
            x1="6.7986538"
            y1="13.44"
            x2="6.7986538"
            y2="10.64"
            id="路径"
            stroke-linecap="round"
            stroke-linejoin="round"
            transform="translate(6.7987, 12.04) rotate(180) translate(-6.7987, -12.04)"
          ></line>
          <line
            x1="1.4786538"
            y1="8.12"
            x2="1.4786538"
            y2="5.32"
            id="路径"
            stroke-linecap="round"
            stroke-linejoin="round"
            transform="translate(1.4787, 6.72) rotate(270) translate(-1.4787, -6.72)"
          ></line>
          <line
            x1="3.49646513"
            y1="4.16781133"
            x2="3.49646513"
            y2="2.66781133"
            id="路径"
            stroke-linecap="round"
            stroke-linejoin="round"
            transform="translate(3.4965, 3.4178) rotate(315) translate(-3.4965, -3.4178)"
          ></line>
        </g>
      </g>
    </SVGWrap>
  );
}
