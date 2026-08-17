# @genflowly/component-library

Stateless/presentational React components extracted from `genai-react-app`, published as a standalone library. Modeled on `@genflowly/react-assets`.

## Components

Primitives: `Icon`, `PillButton`, `RectangleButton`, `InputTextWithHint`, `InputSelectWithHint`, `PillButtonGroup`, `CheckboxButtonGroup`, `RadioButtonGroup`, `PageHeader`, `Breadcrumbs`

Overlays / self-contained UI: `Modal`, `Tooltip`, `CopyToClipboard`, `SidebarListPanel`, `ResizableSidebar`, `Toast` + `ToastContainer`, `MobileFullPageModal`

Branding: `UserAvatarButton`

Content: `TextContainer` (markdown rendering), `TextEditor` (markdown editor)

SVG icons: `ArchiveIcon`, `LoginIcon`, `SettingsIcon`, `UserIcon`

## Usage

```bash
# .npmrc
@genflowly:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=<GH_PAT_with_read:packages>

npm install @genflowly/component-library
```

```tsx
import { PillButton, Modal, Tooltip } from '@genflowly/component-library';
import '@genflowly/component-library/dist/main.css';
```

Peer dependencies: `react`, `react-dom`, `i18next`, `react-i18next`. Components use `useTranslation()`; the consuming app's i18next instance provides the strings. Theming is driven by CSS custom properties on `[data-theme]` (the bundled CSS ships light/dark defaults; the app may override).

## Development

```bash
npm install
npm run storybook   # preview components at http://localhost:6006 (theme toolbar included)
npm run build       # webpack bundle + type declarations -> dist/
npm test
```

## Publishing

Merged PRs to `main` trigger `.github/workflows/pipeline.yml`: version patch bump, build, and `npm publish` to GitHub Packages. Requires repo secret `BOT_PERSONAL_ACCESS_TOKEN` for the version-bump push.
