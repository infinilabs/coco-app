import { useReactive } from "ahooks";
import { SyntheticEvent, useEffect, useRef } from "react";

interface Options {
  mimeType?: string;
  onSourceopen?: () => Promise<void>;
}

interface State {
  audioUrl?: string;
  loading: boolean;
  playing: boolean;
  currentTime: number;
  totalTime: number;
  bufferQueue: Uint8Array<ArrayBuffer>[];
}

const INITIAL_STATE: State = {
  audioUrl: void 0,
  loading: true,
  playing: false,
  currentTime: 0,
  totalTime: Infinity,
  bufferQueue: [],
};

export const useStreamAudio = (options: Options = {}) => {
  const { mimeType = "audio/mpeg", onSourceopen } = options;

  const state = useReactive<State>({ ...INITIAL_STATE });
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaSourceRef = useRef<MediaSource>();
  const sourceBufferRef = useRef<SourceBuffer>();

  useEffect(() => {
    initMediaSource();

    return () => {
      reset();
    };
  }, []);

  const initMediaSource = () => {
    reset();

    const mediaSource = new MediaSource();

    state.audioUrl = URL.createObjectURL(mediaSource);

    mediaSource.addEventListener("sourceopen", async () => {
      const sourceBuffer = mediaSource.addSourceBuffer(mimeType);

      sourceBuffer.mode = "sequence";

      sourceBuffer.addEventListener("updateend", () => {
        flushBufferQueue();
      });

      sourceBufferRef.current = sourceBuffer;

      await onSourceopen?.();

      mediaSource.endOfStream();
    });

    mediaSourceRef.current = mediaSource;
  };

  const appendBuffer = (data: Uint8Array<ArrayBuffer>) => {
    const sourceBuffer = sourceBufferRef.current;

    if (!sourceBuffer) return;

    if (sourceBuffer.updating) {
      return state.bufferQueue.push(data);
    }

    sourceBuffer.appendBuffer(data);
  };

  const flushBufferQueue = () => {
    const sourceBuffer = sourceBufferRef.current;

    if (!sourceBuffer || sourceBuffer.updating) return;

    const chunk = state.bufferQueue.shift();

    if (!chunk) return;

    sourceBuffer.appendBuffer(chunk);
  };

  const play = () => {
    state.playing = true;

    audioRef.current?.play();
  };

  const pause = () => {
    state.playing = false;

    audioRef.current?.pause();
  };

  const toggle = () => {
    if (state.playing) {
      pause();
    } else {
      play();
    }
  };

  const seek = (duration: number) => {
    if (!audioRef.current) return;

    const nextDuration = Math.max(0, Math.min(duration, state.totalTime));

    audioRef.current.currentTime = nextDuration;
  };

  const reset = () => {
    pause();

    Object.assign(state, { ...INITIAL_STATE });

    mediaSourceRef.current = void 0;
    sourceBufferRef.current = void 0;
  };

  const onCanplay = () => {
    state.loading = false;

    play();
  };

  const onTimeupdate = (event: SyntheticEvent<HTMLAudioElement>) => {
    const { currentTime, duration } = event.currentTarget;

    Object.assign(state, {
      currentTime,
      totalTime: duration,
    });
  };

  const onEnded = pause;

  return {
    ...state,
    audioRef,
    initMediaSource,
    play,
    pause,
    toggle,
    seek,
    reset,
    appendBuffer,
    onCanplay,
    onTimeupdate,
    onEnded,
  };
};
