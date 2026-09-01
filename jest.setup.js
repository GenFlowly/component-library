import '@testing-library/jest-dom';
// Initialize i18next so components using useTranslation render real English strings in tests.
import './i18n';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock matchMedia
window.matchMedia = query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
});

class IntersectionObserver {
  observe = jest.fn();
  disconnect = jest.fn();
  unobserve = jest.fn();
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: IntersectionObserver,
});

class ResizeObserver {
  observe = jest.fn();
  disconnect = jest.fn();
  unobserve = jest.fn();
}
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: ResizeObserver,
});

window.HTMLElement.prototype.scrollIntoView = jest.fn();

// jsdom does not expose structuredClone (used by @dagrejs/dagre for layouts)
if (typeof global.structuredClone !== 'function') {
  global.structuredClone = obj => JSON.parse(JSON.stringify(obj));
}

// Mock react-markdown and plugins to avoid ESM syntax errors in Jest
jest.mock('react-markdown', () => props => {
  const React = require('react');
  return React.createElement(
    'div',
    { 'data-testid': 'markdown-mock' },
    props.children
  );
});
jest.mock('remark-gfm', () => () => {});
jest.mock('rehype-highlight', () => () => {});

jest.mock('@uiw/react-markdown-editor', () => props => {
  const React = require('react');
  return React.createElement(
    'div',
    { 'data-testid': 'markdown-editor-mock' },
    props.children
  );
});

jest.mock('@codemirror/view', () => ({
  EditorView: {
    lineWrapping: {},
    theme: jest.fn(),
    updateListener: { of: jest.fn() },
  },
  keymap: { of: jest.fn() },
}));
jest.mock('@codemirror/state', () => ({
  EditorState: {
    create: jest.fn(),
  },
}));
jest.mock('@codemirror/lang-markdown', () => ({}));
