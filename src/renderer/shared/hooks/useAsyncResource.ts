import { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncResource<T> {
  data: T;
  loading: boolean;
  error: boolean;
  reload: () => void;
}

/**
 * Patrón de carga de SPEC-0002 §17: al cambiar `deps` resetea los datos a `initial` y
 * pone `loading=true` (sin fuga entre ejecuciones, §17.2), ejecuta `loader` y descarta
 * respuestas obsoletas (cancelación por id) si las deps cambian o el componente se desmonta.
 * `initial` debe ser estable (constante del módulo).
 */
export function useAsyncResource<T>(
  loader: () => Promise<T>,
  deps: unknown[],
  initial: T,
): AsyncResource<T> {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const runId = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(() => {
    const id = (runId.current += 1);
    setData(initial);
    setLoading(true);
    setError(false);
    loaderRef
      .current()
      .then((result) => {
        if (id === runId.current) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (id === runId.current) {
          setError(true);
          setLoading(false);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
    return () => {
      // Descarta cualquier respuesta en vuelo al desmontar o cambiar deps.
      runId.current += 1;
    };
  }, [run]);

  return { data, loading, error, reload: run };
}
