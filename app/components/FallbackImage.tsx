'use client';

import Image, { type ImageProps } from 'next/image';
import { useMemo, useState } from 'react';
import { resolveImageUrl, resolveProfileImageUrl } from '../utils/imageUtils';

type FallbackImageProps = Omit<ImageProps, 'src' | 'alt' | 'fill' | 'width' | 'height'> & {
  src?: string | null;
  alt: string;
  sizes?: string;
};

type BaseImageProps = FallbackImageProps & {
  fallbackSrc: string;
  resolver: (src: string | null | undefined) => string;
};

function BaseFallbackImage({
  src,
  fallbackSrc,
  resolver,
  alt,
  sizes = '100vw',
  className,
  ...props
}: BaseImageProps) {
  const resolvedSrc = useMemo(() => resolver(src), [resolver, src]);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const displaySrc =
    !resolvedSrc || failedSrc === resolvedSrc ? fallbackSrc : resolvedSrc;

  const handleError = () => {
    if (resolvedSrc && failedSrc !== resolvedSrc) {
      setFailedSrc(resolvedSrc);
    }
  };

  return (
    <span className="relative block h-full w-full overflow-hidden">
      <Image
        {...props}
        src={displaySrc}
        alt={alt}
        fill
        sizes={sizes}
        className={className}
        onError={handleError}
        unoptimized={displaySrc.startsWith('/icons/')}
      />
    </span>
  );
}

export function ListFallbackImage(props: FallbackImageProps) {
  return (
    <BaseFallbackImage
      {...props}
      fallbackSrc="/icons/default_profile.jpg"
      resolver={resolveImageUrl}
    />
  );
}

export function WorkFallbackImage(props: FallbackImageProps) {
  return (
    <BaseFallbackImage
      {...props}
      fallbackSrc="/icons/default_work.jpg"
      resolver={resolveImageUrl}
    />
  );
}

export function ArtistFallbackImage(props: FallbackImageProps) {
  return (
    <BaseFallbackImage
      {...props}
      fallbackSrc="/icons/default_artist.jpg"
      resolver={resolveProfileImageUrl}
    />
  );
}
