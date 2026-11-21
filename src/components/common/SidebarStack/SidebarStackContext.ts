import { createContext } from 'react';

// Set inside a SidebarStack: its cards grow to their full height instead of
// scrolling inside themselves, and the stack scrolls
export const SidebarStackContext = createContext(false);
