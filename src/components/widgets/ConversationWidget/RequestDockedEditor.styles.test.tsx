import fs from 'fs';
import path from 'path';

const scss = fs.readFileSync(
  path.join(__dirname, 'Request.module.scss'),
  'utf8'
);

// The phone's docked editor: .editorWrapper's block under respond-to-tablet
function dockedEditorRule(): string {
  const wrapper = scss.slice(scss.indexOf('.editorWrapper {'));
  const tablet = wrapper.slice(wrapper.indexOf('@include respond-to-tablet {'));
  return tablet.slice(0, tablet.indexOf('\n  }\n'));
}

describe('docked phone editor', () => {
  // UA-24: the box's own bottom inset on top of the strip Safari keeps above
  // its floating toolbar read as an empty band under the editor
  test('rests on the bottom of the page with no inset under it while the keyboard is closed', () => {
    const rule = dockedEditorRule();
    expect(rule).toContain('position: absolute;');
    expect(rule).toContain('bottom: env(safe-area-inset-bottom, 0px);');
    // --kb is 0 with the keyboard closed, the keyboard's height when open
    expect(rule).toContain(
      'padding-bottom: min(var(--kb), #{$mobile-content-inset});'
    );
  });

  test('keeps its side insets and still rides the keyboard', () => {
    const rule = dockedEditorRule();
    expect(rule).toContain('padding: $mobile-content-inset;');
    expect(rule).toContain('transform: translateY(calc(-1 * var(--kb)));');
  });
});
