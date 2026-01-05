import type { ComponentProps } from "react";
import RoundBox from "../round_box/RoundBox";

type CircleBoxProps = ComponentProps<typeof RoundBox>;

const CircleBox = ({ rect, ...props }: CircleBoxProps) => {
  const radius = Math.min(rect.width, rect.height) / 2;
  return <RoundBox rect={rect} borderRadius={radius} {...props} />;
};

export default CircleBox;
