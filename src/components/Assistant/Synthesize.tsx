import { useEffect, useRef } from "react";
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
import { useStreamAudio } from "@/hooks/useStreamAudio";
import { nanoid } from "nanoid";
import { useChatStore } from "@/stores/chatStore";

dayjs.extend(durationPlugin);

const Synthesize = () => {
  const { isDark } = useThemeStore();
  const { currentService } = useConnectStore();
  const { synthesizeItem, setSynthesizeItem } = useChatStore();
  const clientIdRef = useRef(nanoid());

  const {
    loading,
    playing,
    currentTime,
    totalTime,
    audioRef,
    audioUrl,
    initMediaSource,
    toggle,
    seek,
    appendBuffer,
    onCanplay,
    onTimeupdate,
    onEnded,
  } = useStreamAudio({
    onSourceopen() {
      return platformAdapter.invokeBackend("synthesize", {
        clientId: clientIdRef.current,
        serverId: currentService.id,
        content: synthesizeItem?.content,
        voice: "longwan_v2",
      });
    },
  });

  useEffect(() => {
    const id = nanoid();

    clientIdRef.current = `synthesize-${id}`;

    initMediaSource();

    const unlisten = platformAdapter.listenEvent(
      `synthesize-${id}`,
      ({ payload }) => {
        appendBuffer(new Uint8Array(payload));
      }
    );

    return () => {
      unlisten.then((unmount) => unmount());
    };
  }, [synthesizeItem?.id]);

  return (
    <div className="fixed top-[60px] left-1/2 z-1000 w-[200px] h-12 px-4 flex items-center justify-between -translate-x-1/2 border rounded-lg text-[#333] dark:text-[#D8D8D8] bg-white dark:bg-black dark:border-[#272828] shadow-[0_4px_8px_rgba(0,0,0,0.2)] dark:shadow-[0_4px_8px_rgba(255,255,255,0.15)]">
      <audio
        ref={audioRef}
        src={audioUrl}
        onCanPlay={onCanplay}
        onTimeUpdate={onTimeupdate}
        onEnded={onEnded}
      />

      <div className="flex items-center gap-2">
        {loading ? (
          <img
            src={isDark ? loadingDark : loadingLight}
            className="size-4 animate-spin"
          />
        ) : (
          <div onClick={toggle}>
            {playing ? (
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

        {!loading && (
          <span className="text-sm">
            {dayjs.duration(currentTime * 1000).format("mm:ss")}
          </span>
        )}
      </div>
      <div className="flex gap-3">
        {!loading && totalTime !== Infinity && (
          <>
            <img
              src={isDark ? backDark : backLight}
              className="size-4 cursor-pointer"
              onClick={() => {
                seek(currentTime - 15);
              }}
            />

            <img
              src={isDark ? forwardDark : forwardLight}
              className="size-4 cursor-pointer"
              onClick={() => {
                seek(currentTime + 15);
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
