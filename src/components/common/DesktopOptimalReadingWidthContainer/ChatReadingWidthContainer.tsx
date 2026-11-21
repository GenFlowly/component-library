import React from 'react';
import DesktopOptimalReadingWidthContainer, {
  DesktopOptimalReadingWidthContainerProps,
} from './DesktopOptimalReadingWidthContainer';

export type ChatReadingWidthContainerProps = Omit<
  DesktopOptimalReadingWidthContainerProps,
  'maxWidth'
>;

/**
 * The chat message column: a reading column capped at the width chat apps
 * use for their messages, 48rem (768px) on desktop whatever the screen size.
 */
export default function ChatReadingWidthContainer(
  props: ChatReadingWidthContainerProps
): React.ReactElement {
  return (
    <DesktopOptimalReadingWidthContainer
      maxWidth="var(--reading-width-chat)"
      {...props}
    />
  );
}
