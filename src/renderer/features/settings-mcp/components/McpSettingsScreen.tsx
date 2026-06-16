import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useTranslation } from 'react-i18next';
import { useMcpSettings } from '../hooks/useMcpSettings';

function buildConfigSnippet(port: number, token: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        revops: {
          command: 'npx',
          args: [
            '-y',
            'mcp-remote',
            `http://127.0.0.1:${port}/sse`,
            '--header',
            'x-api-key:${REVOPS_TOKEN}',
          ],
          env: { REVOPS_TOKEN: token },
        },
      },
    },
    null,
    2,
  );
}

export function McpSettingsScreen(): JSX.Element {
  const { t } = useTranslation('common');
  const { status, token, tools, loading, busy, error, toggle, regenerateToken } = useMcpSettings();
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState<'token' | 'config' | null>(null);

  const port = status?.port ?? 0;
  const running = status?.running ?? false;
  const snippet = useMemo(() => buildConfigSnippet(port, token), [port, token]);

  const copy = async (value: string, what: 'token' | 'config'): Promise<void> => {
    await navigator.clipboard.writeText(value);
    setCopied(what);
    window.setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('mcp.title')}
      </Typography>

      <Stack spacing={3} sx={{ maxWidth: 640 }}>
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={running}
                disabled={loading || busy}
                onChange={(event) => void toggle(event.target.checked)}
                inputProps={{ 'aria-label': t('mcp.serverToggle') }}
              />
            }
            label={running ? t('mcp.statusOn') : t('mcp.statusOff')}
          />
          <Typography color="text.primary">{t('mcp.port', { port })}</Typography>
          {error ? (
            <Alert severity="error" sx={{ mt: 1 }}>
              {error}
            </Alert>
          ) : null}
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            {t('mcp.tokenLabel')}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              fullWidth
              type={showToken ? 'text' : 'password'}
              value={token}
              InputProps={{ readOnly: true }}
              inputProps={{ 'aria-label': t('mcp.tokenLabel') }}
            />
            <IconButton
              onClick={() => setShowToken((v) => !v)}
              aria-label={showToken ? t('mcp.hideToken') : t('mcp.showToken')}
            >
              {showToken ? <VisibilityOffIcon /> : <VisibilityIcon />}
            </IconButton>
            <IconButton
              onClick={() => void copy(token, 'token')}
              aria-label={t('mcp.copyToken')}
            >
              <ContentCopyIcon />
            </IconButton>
          </Stack>
          <Button sx={{ mt: 1 }} onClick={() => void regenerateToken()} disabled={busy}>
            {t('mcp.regenerate')}
          </Button>
          {copied === 'token' ? (
            <Typography color="text.primary" sx={{ mt: 1 }}>
              {t('mcp.copied')}
            </Typography>
          ) : null}
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            {t('mcp.toolsTitle', { count: tools.length })}
          </Typography>
          {tools.length === 0 ? (
            <Chip size="small" label={t('mcp.noTools')} />
          ) : (
            <List dense aria-label={t('mcp.toolsTitle', { count: tools.length })}>
              {tools.map((tool) => (
                <ListItem key={tool.name} disableGutters>
                  <ListItemText
                    primary={tool.name}
                    secondary={tool.description}
                    secondaryTypographyProps={{ color: 'text.primary' }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        <Divider />

        <Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2">{t('mcp.snippetTitle')}</Typography>
            <Button
              size="small"
              startIcon={<ContentCopyIcon />}
              onClick={() => void copy(snippet, 'config')}
            >
              {t('mcp.copyConfig')}
            </Button>
          </Stack>
          <TextField
            fullWidth
            multiline
            minRows={8}
            value={snippet}
            InputProps={{ readOnly: true, sx: { fontFamily: 'monospace', fontSize: 13 } }}
            inputProps={{ 'aria-label': t('mcp.snippetTitle') }}
          />
          {copied === 'config' ? (
            <Typography color="text.primary" sx={{ mt: 1 }}>
              {t('mcp.copied')}
            </Typography>
          ) : null}
        </Box>
      </Stack>
    </Box>
  );
}
