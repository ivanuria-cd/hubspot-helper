import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

interface EmptyStateProps {
  message: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({ message, action, icon }: EmptyStateProps): JSX.Element {
  return (
    <Box sx={{ py: 4, textAlign: 'center', color: 'text.primary' }} role="status">
      {icon}
      <Typography variant="body1" color="text.primary">
        {message}
      </Typography>
      {action ? <Box sx={{ mt: 2 }}>{action}</Box> : null}
    </Box>
  );
}
