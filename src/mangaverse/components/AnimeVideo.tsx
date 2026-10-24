import { useEffect, useRef, useState } from "react";
import type { StreamSource, StreamPlayback } from "../types/streaming";

export function AnimeVideo({
  source,
  title,
  onEnded,
  subtitles,
}: {
  source: StreamSource;
  title: string;
  onEnded: () => void;
  subtitles?: StreamPlayback["subtitles"];
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const video = videoRef.current;
    if (!video || source.type === "embed") return;
    let disposed = false;
    let destroy: (() => void) | undefined;
    if (source.type === "hls" && !video.canPlayType("application/vnd.apple.mpegurl")) {
      import("hls.js")
        .then(({ default: Hls }) => {
          if (disposed) return;
          if (!Hls.isSupported()) {
            setError("Este navegador não suporta esta fonte. Selecione outra opção.");
            return;
          }
          const hls = new Hls({ maxBufferLength: 30 });
          destroy = () => hls.destroy();
          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              setError("Não foi possível reproduzir esta fonte. Selecione outra opção.");
              hls.destroy();
            }
          });
          hls.loadSource(source.url);
          hls.attachMedia(video);
        })
        .catch(() => {
          if (!disposed) setError("Não foi possível iniciar o player. Tente novamente.");
        });
    } else video.src = source.url;
    return () => {
      disposed = true;
      destroy?.();
      video.removeAttribute("src");
      video.load();
    };
  }, [source]);
  if (source.type === "embed")
    return (
      <iframe
        title={title}
        src={source.url}
        className="w-full aspect-video rounded-xl bg-black"
        sandbox="allow-scripts allow-same-origin allow-presentation"
        allow="fullscreen; encrypted-media; picture-in-picture"
        referrerPolicy="no-referrer"
        allowFullScreen
      />
    );
  return (
    <div>
      <video
        ref={videoRef}
        aria-label={title}
        className="w-full aspect-video rounded-xl bg-black"
        controls
        playsInline
        preload="metadata"
        onEnded={onEnded}
        onError={() => setError("Não foi possível reproduzir esta fonte. Selecione outra opção.")}
        crossOrigin="anonymous"
      >
        {subtitles?.map((track, index) => (
          <track
            key={track.url}
            kind="subtitles"
            src={track.url}
            label={track.label}
            srcLang={
              /portugu|brazil|pt-br/i.test(track.label)
                ? "pt-BR"
                : /english/i.test(track.label)
                  ? "en"
                  : "und"
            }
            default={index === 0}
          />
        ))}
      </video>
      {error && (
        <p role="alert" className="text-sm text-amber-300 mt-3">
          {error}
        </p>
      )}
    </div>
  );
}
