import React from 'react';
import { useTranslation } from 'react-i18next';
import { VendorBrandName } from './BrandName';
import styles from './Response.module.scss';

interface ResponseSwipeLabelProps {
  vendor: string;
  model?: string | null;
  position: number;
  total: number;
  isFading: boolean;
}

/**
 * Who wrote the response under the finger, shown only during a swipe. The card
 * header names the vendor for assistive tech, so this stays out of its way.
 */
export default function ResponseSwipeLabel({
  vendor,
  model,
  position,
  total,
  isFading,
}: ResponseSwipeLabelProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.swipeLabelTrack} aria-hidden="true">
      <div
        className={`${styles.swipeLabel} ${isFading ? styles.swipeLabelFading : ''}`}
        data-testid="response-swipe-label"
      >
        <VendorBrandName
          vendorId={vendor}
          as="span"
          className={styles.swipeLabelVendor}
        />
        {model && <span className={styles.swipeLabelModel}>{model}</span>}
        {total > 1 ? (
          <span className={styles.swipeLabelDots}>
            {Array.from({ length: total }, (_, index) => (
              <span
                key={index}
                className={`${styles.swipeLabelDot} ${index === position ? styles.swipeLabelDotActive : ''}`}
              />
            ))}
          </span>
        ) : (
          <span className={styles.swipeLabelOnly}>
            {t('conversation.response.onlyResponse')}
          </span>
        )}
      </div>
    </div>
  );
}
