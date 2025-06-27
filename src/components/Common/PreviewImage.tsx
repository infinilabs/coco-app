import { useBoolean } from "ahooks";
import clsx from "clsx";
import { CircleChevronLeft, CircleChevronRight } from "lucide-react";
import { FC, useState } from "react";
import { twMerge } from "tailwind-merge";

interface PreviewImageProps {
  urls: string[];
  classNames?: {
    container?: string;
    image?: string;
  };
}

const PreviewImage: FC<PreviewImageProps> = (props) => {
  const { urls, classNames } = props;
  const [open, { setTrue, setFalse }] = useBoolean();
  const [index, setIndex] = useState(0);

  const handlePrev = () => {
    const nextIndex = index === 0 ? urls.length - 1 : index - 1;

    setIndex(nextIndex);
  };

  const handleNext = () => {
    const nextIndex = index === urls.length - 1 ? 0 : index + 1;

    setIndex(nextIndex);
  };

  return (
    <>
      <div className={twMerge("flex gap-3", classNames?.container)}>
        {urls.map((url, index) => {
          return (
            <img
              key={url}
              src={url}
              className={twMerge("h-[125px] cursor-pointer", classNames?.image)}
              onClick={() => {
                setTrue();

                setIndex(index);
              }}
            />
          );
        })}
      </div>

      <div
        className={clsx("fixed inset-0 z-2000", {
          hidden: !open,
        })}
      >
        <div
          className="absolute inset-0 flex items-center justify-center gap-2 px-2 bg-black/65 rounded-xl"
          onClick={setFalse}
        >
          <CircleChevronLeft
            className={clsx("size-6 text-white cursor-pointer", {
              "opacity-50 !cursor-not-allowed": urls.length === 1,
            })}
            onClick={(event) => {
              event.stopPropagation();

              handlePrev();
            }}
          />

          <div
            className="flex-1"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <img src={urls[index]} className="size-full object-contain" />
          </div>

          <CircleChevronRight
            className={clsx("size-6 text-white cursor-pointer", {
              "opacity-50 !cursor-not-allowed": urls.length === 1,
            })}
            onClick={(event) => {
              event.stopPropagation();

              handleNext();
            }}
          />
        </div>
      </div>
    </>
  );
};

export default PreviewImage;
