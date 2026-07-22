/** Oculta un elemento visualmente conservando su nombre accesible (SPEC-0002 §36). */
export const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;
