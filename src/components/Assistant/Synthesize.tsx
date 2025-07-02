import { useEffect, useRef } from "react";
import {
  useAsyncEffect,
  useEventListener,
  useReactive,
  useUnmount,
} from "ahooks";
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
import { useConnectStore } from "@/stores/connectStore";
import platformAdapter from "@/utils/platformAdapter";
import { useAppStore } from "@/stores/appStore";
import {listen} from "@tauri-apps/api/event";

dayjs.extend(durationPlugin);

interface State {
  loading: boolean;
  playing: boolean;
  currentDuration: number;
  totalDuration: number;
}

const INITIAL_STATE: State = {
  loading: true,
  playing: false,
  currentDuration: 0,
  totalDuration: 0,
};

const Synthesize = () => {
  const { isDark } = useThemeStore();
  const state = useReactive<State>({ ...INITIAL_STATE });
  const audioRef = useRef<HTMLAudioElement>();
  const { synthesizeItem, currentService, setSynthesizeItem } =
    useConnectStore();
  const { addError } = useAppStore();
  const unlistenRef = useRef<() => void>();

  // const audioContext = new AudioContext();
  // const source = audioContext.createBufferSource();
  // let audioBufferQueue = [];

  useAsyncEffect(async () => {
    try {
      if (!synthesizeItem) return;

      resetState();

      const { id, content } = synthesizeItem;

      await platformAdapter.invokeBackend<number[]>("synthesize", {
        clientId: "synthesize_"+id,
        serverId: currentService.id,
        content,
        voice: "longwan_v2",
      });

      listen<string>('synthesize_'+id, async (event) => {
        const base64 = event.payload;
        console.log("base64", base64);
        // const binary = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        //
        // // Decode and play buffer (note: this may cause latency, consider using Web Audio stream)
        // const buffer = await audioContext.decodeAudioData(binary.buffer.slice(0));
        // const source = audioContext.createBufferSource();
        // source.buffer = buffer;
        // source.connect(audioContext.destination);
        // source.start();
      });

      // unlistenRef.current = await platformAdapter.listenEvent(
      //   id,
      //   ({ payload }) => {
      //     console.log("payload", payload);
      //   }
      // );

      // return () => {
      //   unlisten.then((fn) => {
      //     fn();
      //   });
      // };

      // const blob = new Blob([new Uint8Array(result)], { type: "audio/wav" });

      // url = URL.createObjectURL(blob);

      // setSynthesizeUrls(synthesizeUrls.concat({ id, url }));

      // if (audioRef.current) {
      //   audioRef.current.src = url;
      // } else {
      //   audioRef.current = new Audio(url);
      // }
    } catch (error) {
      addError(error as string);

      setSynthesizeItem(void 0);
    }
  }, [synthesizeItem?.id]);

  useUnmount(() => {
    unlistenRef.current?.();

    resetState();
  });

  useEventListener(
    "loadedmetadata",
    () => {
      if (!audioRef.current) return;

      console.log("audio.duration", audioRef.current.duration);

      state.totalDuration = Math.round(audioRef.current.duration);
    },
    {
      target: audioRef,
    }
  );

  useEventListener(
    "canplaythrough",
    () => {
      state.loading = false;

      state.playing = true;
    },
    {
      target: audioRef,
    }
  );

  useEventListener(
    "timeupdate",
    () => {
      if (!audioRef.current) return;

      state.currentDuration = audioRef.current.currentTime;
    },
    {
      target: audioRef,
    }
  );

  useEventListener(
    "ended",
    () => {
      state.playing = false;
    },
    { target: audioRef }
  );

  useEffect(() => {
    if (!audioRef.current) return;

    if (state.playing) {
      if (state.currentDuration >= state.totalDuration) {
        audioRef.current.currentTime = 0;
      }

      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  }, [state.playing]);

  const resetState = () => {
    audioRef.current?.pause();

    Object.assign(state, { ...INITIAL_STATE });
  };

  const changeCurrentDuration = (duration: number) => {
    if (!audioRef.current) return;

    let nextDuration = duration;

    if (duration < 0) {
      nextDuration = 0;
    }

    if (duration >= state.totalDuration) {
      nextDuration = state.totalDuration;

      state.playing = false;
    }

    audioRef.current.currentTime = nextDuration;
  };

  const renderFormatTime = () => {
    return dayjs.duration(state.currentDuration * 1000).format("mm:ss");
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

        {!state.loading && (
          <span className="text-sm">{renderFormatTime()}</span>
        )}
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
          onClick={() => {
            setSynthesizeItem(void 0);
          }}
        />
      </div>
    </div>
  );
};

export default Synthesize;
