import { Box, Divider, List, ListItem, Typography } from '@mui/material';
import type { ReactNode } from 'react';

function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push(<strong key={`${keyBase}-b-${i}`}>{token.slice(2, -2)}</strong>);
    } else {
      nodes.push(<code key={`${keyBase}-c-${i}`}>{token.slice(1, -1)}</code>);
    }
    lastIndex = match.index + token.length;
    i += 1;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

interface PendingList {
  ordered: boolean;
  items: string[];
}

/** Renderizador Markdown mínimo (encabezados, párrafos, listas, énfasis, código) sin dependencias. */
export function MarkdownView({ content }: { content: string }): JSX.Element {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: JSX.Element[] = [];
  let pending: PendingList | null = null;
  let key = 0;

  const flush = (list: PendingList | null): void => {
    if (!list) return;
    const listKey = key++;
    blocks.push(
      <List
        key={`list-${listKey}`}
        component={list.ordered ? 'ol' : 'ul'}
        sx={{ listStyleType: list.ordered ? 'decimal' : 'disc', pl: 4, py: 0 }}
      >
        {list.items.map((item, idx) => (
          <ListItem key={idx} disableGutters sx={{ display: 'list-item', py: 0.25 }}>
            <Typography component="span" color="text.primary">
              {renderInline(item, `li-${listKey}-${idx}`)}
            </Typography>
          </ListItem>
        ))}
      </List>,
    );
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.trim() === '') {
      flush(pending);
      pending = null;
      continue;
    }
    if (line.startsWith('### ')) {
      flush(pending);
      pending = null;
      blocks.push(
        <Typography key={key++} variant="h6" sx={{ mt: 2 }}>
          {renderInline(line.slice(4), `h3-${key}`)}
        </Typography>,
      );
      continue;
    }
    if (line.startsWith('## ')) {
      flush(pending);
      pending = null;
      blocks.push(
        <Typography key={key++} variant="h5" sx={{ mt: 3 }}>
          {renderInline(line.slice(3), `h2-${key}`)}
        </Typography>,
      );
      continue;
    }
    if (line.startsWith('# ')) {
      flush(pending);
      pending = null;
      blocks.push(
        <Typography key={key++} variant="h4" gutterBottom>
          {renderInline(line.slice(2), `h1-${key}`)}
        </Typography>,
      );
      continue;
    }
    if (line.trim() === '---') {
      flush(pending);
      pending = null;
      blocks.push(<Divider key={key++} sx={{ my: 2 }} />);
      continue;
    }

    const ordered = /^\d+\.\s+(.*)$/.exec(line);
    if (ordered) {
      if (!pending || !pending.ordered) {
        flush(pending);
        pending = { ordered: true, items: [] };
      }
      pending.items.push(ordered[1] ?? '');
      continue;
    }
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      if (!pending || pending.ordered) {
        flush(pending);
        pending = { ordered: false, items: [] };
      }
      pending.items.push(bullet[1] ?? '');
      continue;
    }

    flush(pending);
    pending = null;
    blocks.push(
      <Typography key={key++} variant="body1" color="text.primary" sx={{ mt: 1 }}>
        {renderInline(line, `p-${key}`)}
      </Typography>,
    );
  }
  flush(pending);

  return <Box>{blocks}</Box>;
}
