import React, { useState } from 'react';

interface OptimizedPictureProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  webpSrc?: string;
  webpSrcSet?: string;
  fallbackSrc: string;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean; // If true, loads eagerly for above-the-fold hero assets
}

/**
 * High-performance responsive <picture> component.
 * Automatically serves lightweight next-gen WebP with PNG/JPEG fallback,
 * responsive srcset for mobile/retina displays, and async decoding.
 */
export const OptimizedPicture: React.FC<OptimizedPictureProps> = ({
  webpSrc,
  webpSrcSet,
  fallbackSrc,
  alt,
  sizes = '(max-width: 640px) 320px, (max-width: 1024px) 640px, 1024px',
  className = '',
  priority = false,
  ...rest
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <picture className="inline-block relative overflow-hidden">
      {/* Next-gen WebP source with responsive breakpoints */}
      {webpSrcSet ? (
        <source type="image/webp" srcSet={webpSrcSet} sizes={sizes} />
      ) : webpSrc ? (
        <source type="image/webp" srcSet={webpSrc} />
      ) : null}

      {/* Legacy PNG/JPEG fallback image */}
      <img
        src={fallbackSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={() => setIsLoaded(true)}
        className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-90'} ${className}`}
        {...rest}
      />
    </picture>
  );
};
