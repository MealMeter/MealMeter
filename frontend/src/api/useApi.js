// 역할: 페이지에서 서버 데이터를 불러올 때 쓰는 훅 (불러오는 중 / 오류 / 데이터 상태 관리).
// const { data, loading, error, setData, reload } = useApi(() => getRanking(), []);
import { useCallback, useEffect, useState } from 'react';

export function useApi(fetcher, deps) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false; // 페이지를 떠난 뒤 늦게 온 응답은 버린다
    setLoading(true);
    setError(null);
    fetcher()
      .then((result) => {
        if (!ignore) setData(result);
      })
      .catch((err) => {
        if (!ignore) setError(err.message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return { data, loading, error, setData, reload };
}
