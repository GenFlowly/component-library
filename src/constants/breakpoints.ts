/**
 * Below this width there isn't room for a persistent side panel/button row
 * alongside content — matches the SCSS $breakpoint-tablet value and the
 * respond-to-tablet mixin used throughout the conversation widgets for this
 * same "mobile mode" chrome. Any JS branching between mobile- and desktop-
 * shaped markup must use this, not a hardcoded number, or it desyncs from
 * the CSS breakpoint and produces mismatched markup.
 */
export const NARROW_BREAKPOINT = 1024;
