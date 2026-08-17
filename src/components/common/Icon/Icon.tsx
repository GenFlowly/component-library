// src/components/common/Icon/Icon.tsx
import React from 'react';

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** URL of the svg asset, painted via CSS mask and tinted by `currentColor`. */
  src: string;
  /**
   * Accessible name for the icon. Omit it (or pass an empty string) for
   * decorative icons: they render `aria-hidden` with no role, like
   * `<img alt="">`. Provide a real label only when the icon conveys
   * information on its own — for icon-only buttons, label the button
   * instead and leave the icon decorative.
   */
  alt?: string;
  /** Width/height. Defaults to `1em` so the icon scales with the text. */
  size?: string | number;
  className?: string;
}

export const Icon = ({
  src,
  alt,
  size = '1em',
  className,
  ...props
}: IconProps) => {
  const isDecorative = !alt;
  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        backgroundColor: 'currentColor',
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
        flexShrink: 0,
        // Keep the currentColor fill in Windows High Contrast mode, where
        // forced colors would otherwise blank out background-color masks.
        forcedColorAdjust: 'none',
      }}
      role={isDecorative ? undefined : 'img'}
      aria-label={isDecorative ? undefined : alt}
      aria-hidden={isDecorative || undefined}
      {...props}
    />
  );
};
