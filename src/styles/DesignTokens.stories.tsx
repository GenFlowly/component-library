import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

/**
 * Live inventory of the theme's CSS custom properties, shown side by side in
 * light and dark. The token list is enumerated from the loaded stylesheets at
 * render time (the `:root` block and the `[data-theme='dark']` block in
 * themes.scss), so new tokens appear here automatically.
 *
 * Why it exists: several dark-theme tokens resolve to the same color —
 * border-light, background-tertiary and the response container surface were
 * all #3a3a3c, which made table borders and code blocks vanish on the mobile
 * response surface. The "Duplicate values" panel makes that class of
 * collision visible at a glance; "Inherits light value" lists tokens the dark
 * theme never overrides.
 */

type TokenMap = Record<string, string>;

const COLOR_PREFIX = '--color-';
const SHADOW_PREFIX = '--shadow';
// Non-color tokens worth listing; anything else (e.g. third-party vars from
// KaTeX/highlight.js stylesheets) is ignored.
const OTHER_PREFIXES = [
  '--spacing',
  '--radius',
  '--widget',
  '--page-',
  '--transition',
  '--breakpoint',
  '--mobile',
  '--message',
  '--response',
];

/** Declared custom properties of the light (:root) and dark theme blocks. */
function scanThemeTokens(): { light: TokenMap; dark: TokenMap } {
  const light: TokenMap = {};
  const dark: TokenMap = {};
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // cross-origin sheet
    }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSStyleRule)) continue;
      const selector = rule.selectorText.replace(/"/g, "'");
      const target =
        selector === ':root'
          ? light
          : selector === "[data-theme='dark']"
            ? dark
            : null;
      if (!target) continue;
      for (let i = 0; i < rule.style.length; i++) {
        const prop = rule.style.item(i);
        if (prop.startsWith('--')) {
          target[prop] = rule.style.getPropertyValue(prop).trim();
        }
      }
    }
  }
  return { light, dark };
}

/** Resolve var() references against the theme map (dark falls back to light). */
function resolveValue(
  raw: string,
  theme: TokenMap,
  base: TokenMap,
  depth = 0
): string {
  if (depth > 8) return raw;
  const match = raw.match(/var\((--[\w-]+)(?:\s*,\s*([^)]+))?\)/);
  if (!match) return raw;
  const replacement = theme[match[1]] ?? base[match[1]] ?? match[2] ?? '';
  return resolveValue(
    raw.replace(match[0], replacement),
    theme,
    base,
    depth + 1
  );
}

function categoryOf(name: string): string {
  const rest = name.slice(COLOR_PREFIX.length);
  if (rest.startsWith('background') || rest.startsWith('page-background'))
    return 'Backgrounds';
  if (rest.includes('container-background')) return 'Surfaces';
  if (rest.startsWith('border')) return 'Borders';
  if (rest.startsWith('text')) return 'Text';
  if (rest.startsWith('primary') || rest.startsWith('button-primary'))
    return 'Primary';
  if (
    rest.startsWith('error') ||
    rest.startsWith('danger') ||
    rest.startsWith('button-danger')
  )
    return 'Error / Danger';
  if (rest.startsWith('success')) return 'Success';
  if (rest.startsWith('sidebar') || rest.startsWith('navbar'))
    return 'Chrome (sidebar / navbar)';
  if (rest.startsWith('disabled')) return 'Disabled';
  return 'Other colors';
}

const CATEGORY_ORDER = [
  'Backgrounds',
  'Surfaces',
  'Borders',
  'Text',
  'Primary',
  'Success',
  'Error / Danger',
  'Chrome (sidebar / navbar)',
  'Disabled',
  'Other colors',
];

const mono: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: 12,
};

function Swatch({ color, size = 26 }: { color: string; size?: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: 6,
        background: color,
        // Neutral translucent outline so swatches matching the panel
        // background stay visible — that invisibility is the bug class this
        // story exists to catch.
        boxShadow: 'inset 0 0 0 1px rgba(128, 128, 128, 0.55)',
        flexShrink: 0,
      }}
    />
  );
}

interface ThemeColumnProps {
  title: string;
  resolved: TokenMap; // token -> resolved color
  panelBg: string;
  panelText: string;
  mutedText: string;
}

function ThemeColumn({
  title,
  resolved,
  panelBg,
  panelText,
  mutedText,
}: ThemeColumnProps) {
  const names = Object.keys(resolved).sort();

  // value -> tokens sharing it (the collision detector)
  const byValue = new Map<string, string[]>();
  for (const name of names) {
    const key = resolved[name].toLowerCase().replace(/\s+/g, ' ');
    byValue.set(key, [...(byValue.get(key) ?? []), name]);
  }
  const duplicates = Array.from(byValue.entries())
    .filter(([, tokens]) => tokens.length > 1)
    .sort((a, b) => b[1].length - a[1].length);
  const dupCountFor = (name: string) =>
    byValue.get(resolved[name].toLowerCase().replace(/\s+/g, ' '))?.length ?? 1;

  const byCategory = new Map<string, string[]>();
  for (const name of names) {
    const cat = categoryOf(name);
    byCategory.set(cat, [...(byCategory.get(cat) ?? []), name]);
  }

  return (
    <div
      style={{
        background: panelBg,
        color: panelText,
        borderRadius: 10,
        padding: '1rem 1.25rem',
        minWidth: 0,
      }}
    >
      <h2 style={{ margin: '0 0 0.75rem', fontSize: 18 }}>{title}</h2>

      <section
        style={{
          border: '1px solid rgba(128, 128, 128, 0.5)',
          borderRadius: 8,
          padding: '0.6rem 0.8rem',
          marginBottom: '1rem',
        }}
      >
        <h3 style={{ margin: '0 0 0.5rem', fontSize: 14 }}>
          Duplicate values ({duplicates.length} groups)
        </h3>
        <p style={{ margin: '0 0 0.6rem', fontSize: 12, color: mutedText }}>
          Tokens resolving to the same color. Aliases can be intentional, but a
          border sharing its value with a surface makes that border invisible on
          that surface.
        </p>
        {duplicates.map(([value, tokens]) => (
          <div
            key={value}
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              padding: '0.3rem 0',
            }}
          >
            <Swatch color={value} size={20} />
            <div style={{ minWidth: 0 }}>
              <div style={{ ...mono, fontWeight: 600 }}>{value}</div>
              <div style={{ ...mono, color: mutedText }}>
                {tokens.map(t => t.replace(COLOR_PREFIX, '')).join(' · ')}
              </div>
            </div>
          </div>
        ))}
        {duplicates.length === 0 && (
          <div style={{ ...mono, color: mutedText }}>none</div>
        )}
      </section>

      {CATEGORY_ORDER.filter(cat => byCategory.has(cat)).map(cat => (
        <section key={cat} style={{ marginBottom: '0.9rem' }}>
          <h3
            style={{
              margin: '0 0 0.35rem',
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: mutedText,
            }}
          >
            {cat}
          </h3>
          {(byCategory.get(cat) ?? []).map(name => (
            <div
              key={name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '0.22rem 0',
              }}
            >
              <Swatch color={resolved[name]} />
              <span style={{ ...mono, flex: '1 1 auto', minWidth: 0 }}>
                {name.replace(COLOR_PREFIX, '')}
              </span>
              <span style={{ ...mono, color: mutedText }}>
                {resolved[name]}
              </span>
              {dupCountFor(name) > 1 && (
                <span
                  title="shares its value with other tokens — see Duplicate values"
                  style={{
                    ...mono,
                    fontWeight: 700,
                    padding: '0 6px',
                    borderRadius: 999,
                    border: '1px solid rgba(128, 128, 128, 0.6)',
                  }}
                >
                  ×{dupCountFor(name)}
                </span>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

function TokenGallery() {
  const [{ light, dark }] = useState(scanThemeTokens);

  const colorNames = Object.keys(light).filter(n => n.startsWith(COLOR_PREFIX));
  const resolvedLight: TokenMap = {};
  const resolvedDark: TokenMap = {};
  for (const name of colorNames) {
    resolvedLight[name] = resolveValue(light[name], light, light);
    resolvedDark[name] = resolveValue(dark[name] ?? light[name], dark, light);
  }

  const notOverriddenInDark = colorNames.filter(n => !(n in dark)).sort();

  const shadowNames = Object.keys(light)
    .filter(n => n.startsWith(SHADOW_PREFIX))
    .sort();
  const otherNames = Object.keys(light)
    .filter(n => OTHER_PREFIXES.some(p => n.startsWith(p)))
    .sort();

  const lightPanel = {
    bg: resolvedLight['--color-background'] ?? '#fff',
    text: resolvedLight['--color-text-primary'] ?? '#000',
    muted: resolvedLight['--color-text-muted'] ?? '#666',
  };
  const darkPanel = {
    bg: resolvedDark['--color-background'] ?? '#000',
    text: resolvedDark['--color-text-primary'] ?? '#fff',
    muted: resolvedDark['--color-text-muted'] ?? '#999',
  };

  return (
    <div style={{ padding: '1rem', maxWidth: 1400 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: '1rem',
          alignItems: 'start',
        }}
      >
        <ThemeColumn
          title="Light"
          resolved={resolvedLight}
          panelBg={lightPanel.bg}
          panelText={lightPanel.text}
          mutedText={lightPanel.muted}
        />
        <ThemeColumn
          title="Dark"
          resolved={resolvedDark}
          panelBg={darkPanel.bg}
          panelText={darkPanel.text}
          mutedText={darkPanel.muted}
        />
      </div>

      <section style={{ marginTop: '1.25rem' }}>
        <h3 style={{ fontSize: 14, margin: '0 0 0.4rem' }}>
          Color tokens with no dark override ({notOverriddenInDark.length})
        </h3>
        <p style={{ fontSize: 12, margin: '0 0 0.5rem', opacity: 0.75 }}>
          These keep their light value in dark mode. Fine for brand constants;
          suspicious for surfaces and text.
        </p>
        <div style={mono}>
          {notOverriddenInDark.map(n => (
            <div
              key={n}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0.15rem 0',
              }}
            >
              <Swatch color={resolvedLight[n]} size={16} />
              {n.replace(COLOR_PREFIX, '')} — {resolvedLight[n]}
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: '1.25rem' }}>
        <h3 style={{ fontSize: 14, margin: '0 0 0.4rem' }}>Shadows</h3>
        {shadowNames.map(n => (
          <div
            key={n}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '0.3rem 0',
              ...mono,
            }}
          >
            <span style={{ width: 130 }}>{n}</span>
            <span style={{ opacity: 0.75 }}>
              light: {resolveValue(light[n], light, light)} · dark:{' '}
              {resolveValue(dark[n] ?? light[n], dark, light)}
            </span>
          </div>
        ))}
      </section>

      <section style={{ marginTop: '1.25rem' }}>
        <h3 style={{ fontSize: 14, margin: '0 0 0.4rem' }}>Non-color tokens</h3>
        <div style={mono}>
          {otherNames.map(n => {
            const lightVal = light[n];
            const darkVal = dark[n];
            return (
              <div key={n} style={{ padding: '0.12rem 0' }}>
                {n}: {lightVal}
                {darkVal && darkVal !== lightVal ? ` (dark: ${darkVal})` : ''}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

const meta: Meta<typeof TokenGallery> = {
  title: 'Design System/Design Tokens',
  component: TokenGallery,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Every theme CSS custom property, light and dark side by side, enumerated live from ' +
          'themes.scss. The Duplicate values panel surfaces tokens that resolve to the same color ' +
          '(the root cause of borders disappearing on same-colored surfaces), and the no-dark-override ' +
          'list shows tokens the dark theme inherits unchanged from light.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof TokenGallery>;

export const AllTokens: Story = {};
