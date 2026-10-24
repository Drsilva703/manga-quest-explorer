import type { ImgHTMLAttributes } from "react";

export function AnimeImage({
  src,
  alt,
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, "onError"> & { src: string }) {
  return (
    <img
      key={src}
      {...props}
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={(event) => {
        const image = event.currentTarget;
        if (!image.dataset.proxied) {
          image.dataset.proxied = "true";
          image.src = `/api/anime/cover?url=${encodeURIComponent(src)}`;
        } else image.style.visibility = "hidden";
      }}
    />
  );
}
