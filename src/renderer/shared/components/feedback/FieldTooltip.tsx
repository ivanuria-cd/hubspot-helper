import { useId } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useTranslation } from 'react-i18next';

const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;

interface FieldTooltipProps {
  helpKey: string;
  describedById?: string;
  ns?: string;
}

/**
 * Ayuda contextual i18n de un campo rellenable (SPEC-0002 §18). Icono accesible
 * (operable por teclado, `Esc` cierra) cuyo texto se resuelve por i18n; si se pasa
 * `describedById`, expone además una descripción oculta para enlazar por `aria-describedby`.
 */
export function FieldTooltip({ helpKey, describedById, ns = 'common' }: FieldTooltipProps): JSX.Element {
  const { t } = useTranslation(ns);
  const text = t(helpKey);
  return (
    <>
      <Tooltip title={text} enterTouchDelay={0} leaveTouchDelay={4000}>
        <IconButton aria-label={text} size="small" edge="end">
          <HelpOutlineIcon fontSize="inherit" />
        </IconButton>
      </Tooltip>
      {describedById ? (
        <Box component="span" id={describedById} sx={visuallyHidden}>
          {text}
        </Box>
      ) : null}
    </>
  );
}

interface FieldHelp {
  describedById: string;
  tooltip: JSX.Element;
}

/**
 * Empareja un campo con su `FieldTooltip` (SPEC-0002 §18). Devuelve el `describedById`
 * para `aria-describedby` del control y el elemento `tooltip` listo para colocar junto al campo.
 */
export function useFieldHelp(helpKey: string, ns = 'common'): FieldHelp {
  const describedById = useId();
  return {
    describedById,
    tooltip: <FieldTooltip helpKey={helpKey} describedById={describedById} ns={ns} />,
  };
}
