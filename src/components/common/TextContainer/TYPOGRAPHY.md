# Reading typography

The type chart for the reading setting (`ReaderFriendlyTextContainer`): every
response, prompt, instruction and policy page on web and iOS. The web rules
live in `TextContainer.module.scss` (`.article.reader .markdownBody`); the iOS
app mirrors them in `MarkdownDocument.swift` (`Options.reader`). Change this
chart first, then both platforms together.

## Rules

1. **Fonts follow the role, not the element.** Everything that reads as prose
   or as a heading is Source Serif 4. Roboto is only for data and interface
   (tables, citation chips); code is monospace; math is KaTeX.
2. **Hierarchy comes from size and weight, never from switching faces.** A
   line that is only bold text (`**Pros**`) and a real `h4` look the same.
3. **No heading is smaller than the text around it.** Each level is larger
   than the one below; `h4`–`h6` are body size, semibold.
4. **Three visible heading levels.** `h4`, `h5` and `h6` share one style.

## Chart

Sizes are font size / line height in px. Desktop is the web above 1024px;
phone is the web at or below it and the iOS app.

| Role                     | Face           | Weight         | Desktop      | Phone        |
| ------------------------ | -------------- | -------------- | ------------ | ------------ |
| `h1`                     | Source Serif 4 | 600            | 28 / 36      | 24 / 32      |
| `h2`                     | Source Serif 4 | 600            | 23 / 30      | 21 / 28      |
| `h3`                     | Source Serif 4 | 600            | 20 / 28      | 19 / 26      |
| `h4`–`h6`                | Source Serif 4 | 600            | body         | body         |
| Paragraph, list item     | Source Serif 4 | 400            | 18 / 31      | 17 / 28      |
| Prompt (the user's turn) | Source Serif 4 | 500            | 19 / 32      | 18 / 30      |
| Blockquote               | Source Serif 4 | body, italic   | body         | body         |
| Bold / italic in text    | Source Serif 4 | 700 / italic   | inherits     | inherits     |
| Table header             | Roboto         | 600, uppercase | 12 / 16      | 12 / 16      |
| Table cell               | Roboto         | 400            | 15 / 22      | 14 / 20      |
| Code, inline and block   | monospace      | 400            | 15.2         | 15.2         |
| Math                     | KaTeX          | —              | 1.1em inline | 1.1em inline |
| Citation chip            | Roboto         | 500            | 10.5         | 10.5         |

Headings sit 40px below the previous block and 12px above the next (36 / 10
on the phone).
