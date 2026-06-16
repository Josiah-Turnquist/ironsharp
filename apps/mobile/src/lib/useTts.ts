import { useCallback, useRef } from "react";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import * as Speech from "expo-speech";
import { ApiClient, ttsStreamUrl } from "./api";
import { getAuthToken } from "./auth-client";

export type SpeakOptions = {
  voice?: string;
  instructions?: string;
  onDone?: () => void;
};

/**
 * Speaks text aloud, preferring the cloud (ChatGPT-grade) voice and falling
 * back to the on-device voice if the cloud is unavailable (no API key yet,
 * offline, or an error). Either way the caller's onDone fires when the reading
 * finishes, so the guided flow advances regardless. Imperative + single-flight:
 * a new speak() interrupts the previous one.
 */
export function useTts() {
  const playerRef = useRef<AudioPlayer | null>(null);
  const subRef = useRef<{ remove: () => void } | null>(null);
  const usingCloudRef = useRef(false);

  const cleanup = useCallback(() => {
    subRef.current?.remove();
    subRef.current = null;
    if (playerRef.current) {
      try {
        playerRef.current.remove();
      } catch {
        /* already gone */
      }
      playerRef.current = null;
    }
    Speech.stop();
  }, []);

  const speak = useCallback(
    async (text: string, opts: SpeakOptions = {}) => {
      cleanup();
      const trimmed = text.trim();
      if (!trimmed) {
        opts.onDone?.();
        return;
      }

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        opts.onDone?.();
      };

      try {
        const { id } = await ApiClient.prepareTts(trimmed, {
          voice: opts.voice,
          instructions: opts.instructions,
        });
        const token = await getAuthToken();
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
        const player = createAudioPlayer({
          uri: ttsStreamUrl(id),
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        playerRef.current = player;
        usingCloudRef.current = true;
        subRef.current = player.addListener("playbackStatusUpdate", (status) => {
          if (status?.didJustFinish) finish();
        });
        player.play();
      } catch {
        // Cloud unavailable → on-device voice, so the experience still works.
        usingCloudRef.current = false;
        Speech.speak(trimmed, {
          rate: 0.96,
          onDone: finish,
          onStopped: () => {},
          onError: finish,
        });
      }
    },
    [cleanup]
  );

  const stop = useCallback(() => cleanup(), [cleanup]);

  return { speak, stop, isUsingCloud: () => usingCloudRef.current };
}
