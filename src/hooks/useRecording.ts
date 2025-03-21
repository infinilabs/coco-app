import { MutableRefObject, useEffect, useRef, useState } from "react";
import WaveSurfer, { WaveSurferOptions } from "wavesurfer.js";
import RecordPlugin from "wavesurfer.js/dist/plugins/record.esm.js";

interface RecordingOptions extends Omit<WaveSurferOptions, "container"> {
  container: MutableRefObject<HTMLElement | undefined | null>;
  onRecordStart?: () => void;
  onRecordEnd?: (blob: Blob) => void;
}

export const useRecording = (options: RecordingOptions) => {
  const [isRecording, setIsRecording] = useState(false);
  const recordRef = useRef<RecordPlugin>();

  useEffect(() => {
    const { container, onRecordStart, onRecordEnd, ...rest } = options;

    if (!container.current) return;

    const waveSurfer = WaveSurfer.create({
      container: container.current,
      waveColor: "#0072FF",
      height: 20,
      barWidth: 4,
      barRadius: 4,
      barGap: 2,
      ...rest,
    });

    recordRef.current = waveSurfer.registerPlugin(
      RecordPlugin.create({
        renderRecordedAudio: false,
        scrollingWaveform: true,
      })
    );

    recordRef.current.on("record-start", () => {
      console.log("record-start");
      onRecordStart?.();
    });

    recordRef.current.on("record-end", (blob) => {
      console.log("record-end");
      onRecordEnd?.(blob);
    });

    return () => {
      recordRef.current?.destroy();
      waveSurfer.destroy();
    };
  }, []);

  const startRecording = () => {
    if (recordRef.current?.isRecording()) return;

    setIsRecording(true);
    return recordRef.current?.startRecording();
  };

  const stopRecording = () => {
    if (!recordRef.current?.isRecording()) return;

    setIsRecording(false);
    recordRef.current?.stopRecording();
  };

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
};
