/* eslint-disable @next/next/no-img-element */
'use client';

import React, { ImgHTMLAttributes, SyntheticEvent, useState } from 'react';
import { resolveImageUrl, resolveProfileImageUrl } from '../utils/imageUtils';

type FallbackImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string | null;
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
  onError,
  ...props
}: BaseImageProps) {
  const resolvedSrc = resolver(src);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const displaySrc =
    !resolvedSrc || failedSrc === resolvedSrc ? fallbackSrc : resolvedSrc;

  const handleError = (event: SyntheticEvent<HTMLImageElement, Event>) => {
    if (resolvedSrc && failedSrc !== resolvedSrc) {
      setFailedSrc(resolvedSrc);
    }
    onError?.(event);
  };

  return (
    <img
      {...props}
      src={displaySrc}
      alt={alt}
      onError={handleError}
    />
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
