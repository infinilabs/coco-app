import { useEffect, useMemo, useRef } from "react";
import { useReactive } from "ahooks";
import dayjs from "dayjs";
import durationPlugin from "dayjs/plugin/duration";

import { useThemeStore } from "@/stores/themeStore";
import loadingLight from "@/assets/images/ReadAloud/loading-light.png";
import loadingDark from "@/assets/images/ReadAloud/loading-dark.png";
import playLight from "@/assets/images/ReadAloud/play-light.png";
import playDark from "@/assets/images/ReadAloud/play-dark.png";
import pauseLight from "@/assets/images/ReadAloud/pause-light.png";
import pauseDark from "@/assets/images/ReadAloud/pause-dark.png";
import backLight from "@/assets/images/ReadAloud/back-light.png";
import backDark from "@/assets/images/ReadAloud/back-dark.png";
import forwardLight from "@/assets/images/ReadAloud/forward-light.png";
import forwardDark from "@/assets/images/ReadAloud/forward-dark.png";
import closeLight from "@/assets/images/ReadAloud/close-light.png";
import closeDark from "@/assets/images/ReadAloud/close-dark.png";

dayjs.extend(durationPlugin);

interface State {
  loading: boolean;
  playing: boolean;
  totalDuration: number;
  currentDuration: number;
}

const ReadAloud = () => {
  const isDark = useThemeStore((state) => state.isDark);
  const state = useReactive<State>({
    loading: false,
    playing: true,
    totalDuration: 300,
    currentDuration: 0,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const formatTime = useMemo(() => {
    return dayjs.duration(state.currentDuration * 1000).format("mm:ss");
  }, [state.currentDuration]);

  useEffect(() => {
    if (state.playing && state.currentDuration >= state.totalDuration) {
      state.currentDuration = 0;
    }

    changeCurrentDuration();
  }, [state.playing]);

  const changeCurrentDuration = (duration = state.currentDuration) => {
    clearTimeout(timerRef.current);

    let nextDuration = duration;

    if (duration < 0) {
      nextDuration = 0;
    }

    if (duration >= state.totalDuration) {
      state.currentDuration = state.totalDuration;

      state.playing = false;
    }

    if (!state.playing) return;

    state.currentDuration = nextDuration;

    timerRef.current = setTimeout(() => {
      changeCurrentDuration(duration + 1);
    }, 1000);
  };

  return (
    <div className="fixed top-[60px] left-1/2 z-1000 w-[200px] h-12 px-4 flex items-center justify-between -translate-x-1/2 border rounded-lg text-[#333] dark:text-[#D8D8D8] bg-white dark:bg-black dark:border-[#272828] shadow-[0_4px_8px_rgba(0,0,0,0.2)] dark:shadow-[0_4px_8px_rgba(255,255,255,0.15)]">
      <div className="flex items-center gap-2">
        {state.loading ? (
          <img
            src={isDark ? loadingDark : loadingLight}
            className="size-4 animate-spin"
          />
        ) : (
          <div
            onClick={() => {
              state.playing = !state.playing;
            }}
          >
            {state.playing ? (
              <img
                src={isDark ? playDark : playLight}
                className="size-4 cursor-pointer"
              />
            ) : (
              <img
                src={isDark ? pauseDark : pauseLight}
                className="size-4 cursor-pointer"
              />
            )}
          </div>
        )}

        <span className="text-sm">{formatTime}</span>
      </div>
      <div className="flex gap-3">
        {!state.loading && (
          <>
            <img
              src={isDark ? backDark : backLight}
              className="size-4 cursor-pointer"
              onClick={() => {
                changeCurrentDuration(state.currentDuration - 15);
              }}
            />

            <img
              src={isDark ? forwardDark : forwardLight}
              className="size-4 cursor-pointer"
              onClick={() => {
                changeCurrentDuration(state.currentDuration + 15);
              }}
            />
          </>
        )}

        <img
          src={isDark ? closeDark : closeLight}
          className="size-4 cursor-pointer"
        />
      </div>
    </div>
  );
};

export default ReadAloud;
