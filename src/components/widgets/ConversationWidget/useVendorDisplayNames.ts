import { useCallback } from 'react';
import { useConversationServices } from './ConversationWidgetContext';
import { fallbackVendorDisplayName } from './vendors';

/**
 * Vendor display names resolved through the host's injected
 * getVendorDisplayName service (typically backed by the backend provider
 * catalog). Accepts either a stored vendor id ("OPENAI", "groq") or a catalog
 * id ("openai"); without an injected service — or until the host's catalog is
 * available — it falls back to a title-cased id.
 */
export function useVendorDisplayNames(): (vendorId: string) => string {
  const { getVendorDisplayName } = useConversationServices();

  return useCallback(
    (vendorId: string) =>
      getVendorDisplayName?.(vendorId) ?? fallbackVendorDisplayName(vendorId),
    [getVendorDisplayName]
  );
}
