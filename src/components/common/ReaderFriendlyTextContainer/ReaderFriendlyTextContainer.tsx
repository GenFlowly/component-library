import React, { createContext, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Options } from 'react-markdown';
import TextContainer, {
  MarkdownLink,
  type TextContainerProps,
} from '../TextContainer/TextContainer';
import CitationChip from '../CitationTooltip/CitationChip';
import CitationTooltip from '../CitationTooltip/CitationTooltip';
import type { WebSource } from '../../widgets/ConversationWidget/conversation.models';
import {
  citationHref,
  countCitations,
  linkifyCitations,
  rehypeCitationRuns,
} from './citations';
import textStyles from '../TextContainer/TextContainer.module.scss';

export interface ReaderFriendlyTextContainerProps extends TextContainerProps {
  /**
   * The web sources behind the text's [n] citation markers. Each marker with
   * a source becomes a chip that shows the source; without sources the text
   * reads the same, with no chips.
   */
  sources?: WebSource[] | null;
}

interface CitationLookup {
  byIndex: ReadonlyMap<number, WebSource>;
  counts: ReadonlyMap<number, number>;
}

const CitationContext = createContext<CitationLookup | null>(null);

const textOf = (children: React.ReactNode): string =>
  React.Children.toArray(children)
    .map(child =>
      typeof child === 'string' || typeof child === 'number'
        ? String(child)
        : ''
    )
    .join('');

/**
 * A markdown link: a chip with its source's tooltip when it is a citation
 * marker for a known source, an ordinary link otherwise.
 */
export function ReaderLink(props: any) {
  const { t } = useTranslation();
  const lookup = useContext(CitationContext);
  const { href, children } = props;
  const folded: string | undefined = props['data-citation-more'];

  if (lookup && folded) {
    const sources = folded
      .split(' ')
      .map(Number)
      .map(index => lookup.byIndex.get(index))
      .filter((source): source is WebSource => !!source);
    if (sources.length > 0) {
      return (
        <CitationTooltip
          sources={sources}
          citeCounts={lookup.counts}
          data-testid="citation-more"
        >
          <CitationChip
            label={t('common.citation.more', { count: sources.length })}
            markers={textOf(children)}
            href={sources[0].url || undefined}
            aria-label={t('common.citation.moreLabel', {
              count: sources.length,
            })}
            data-testid="citation-more-chip"
          />
        </CitationTooltip>
      );
    }
  }

  const marker = /^\[(\d{1,3})\]$/.exec(textOf(children));
  const source = marker ? lookup?.byIndex.get(Number(marker[1])) : undefined;
  if (marker && source && citationHref(source) === href) {
    return (
      <CitationTooltip
        sources={[source]}
        citeCounts={lookup?.counts}
        data-testid="citation"
      >
        <CitationChip
          label={marker[1]}
          markers={marker[0]}
          href={source.url || undefined}
          aria-label={t('common.citation.label', {
            index: source.index,
            title: source.title || source.url,
          })}
        />
      </CitationTooltip>
    );
  }

  const rest = { ...props };
  delete rest['data-citation-more'];
  return <MarkdownLink {...rest} />;
}

const READER_COMPONENTS = { a: ReaderLink };
const READER_REHYPE_PLUGINS: Options['rehypePlugins'] = [
  [rehypeCitationRuns, { runClassName: textStyles.citationRun }],
];

/**
 * TextContainer in the reading setting every long text in the product shares:
 * a text serif at a comfortable size, measure and spacing, with headings,
 * tables and code kept in the UI face. Citations from `sources` show as
 * chips that open their source in a tooltip. Takes TextContainer's props.
 */
export default function ReaderFriendlyTextContainer({
  sources,
  content,
  className,
  ...rest
}: ReaderFriendlyTextContainerProps) {
  const linked = useMemo(
    () => linkifyCitations(content, sources),
    [content, sources]
  );
  const lookup = useMemo<CitationLookup | null>(
    () =>
      sources && sources.length > 0
        ? {
            byIndex: new Map(sources.map(source => [source.index, source])),
            counts: countCitations(content),
          }
        : null,
    [content, sources]
  );

  return (
    <CitationContext.Provider value={lookup}>
      <TextContainer
        {...rest}
        content={linked}
        className={`${textStyles.reader} ${className ?? ''}`}
        markdownComponents={READER_COMPONENTS}
        markdownRehypePlugins={READER_REHYPE_PLUGINS}
      />
    </CitationContext.Provider>
  );
}
