import { visibleViewportSpace } from './completionPopup';

jest.mock('@codemirror/view', () => ({
  tooltips: () => [],
  EditorView: { theme: () => [] },
}));

describe('visibleViewportSpace', () => {
  const original = window.visualViewport;

  afterEach(() => {
    Object.defineProperty(window, 'visualViewport', {
      value: original,
      configurable: true,
    });
  });

  it('stops above the keyboard', () => {
    Object.defineProperty(window, 'visualViewport', {
      value: { offsetTop: 40, offsetLeft: 0, width: 402, height: 500 },
      configurable: true,
    });

    expect(visibleViewportSpace()).toEqual({
      top: 40,
      left: 0,
      right: 402,
      bottom: 540,
    });
  });

  it('uses the window where the browser has no visual viewport', () => {
    Object.defineProperty(window, 'visualViewport', {
      value: undefined,
      configurable: true,
    });

    expect(visibleViewportSpace()).toEqual({
      top: 0,
      left: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
    });
  });
});
