// 인기 순위 — 명세서 3장 기능 3. 담당: 조현우
// 정렬은 서버가 해서 보내 준다 (평균 별점 높은 순, 메뉴 이름 기준으로 합침).
import { getRanking } from '../../api/index.js';
import { useApi } from '../../api/useApi.js';
import Loading from '../../components/state/Loading.jsx';
import ErrorMessage from '../../components/state/ErrorMessage.jsx';
import EmptyState from '../../components/state/EmptyState.jsx';
import Button from '../../components/ui/Button.jsx';
import RankingTable from './RankingTable.jsx';
import './RankingPage.css';

export default function RankingPage() {
  const { data, loading, error, reload } = useApi(() => getRanking(), []);

  return (
    <section className="ranking-page">
      <h1>우리 학교 인기 메뉴</h1>
      <p className="muted">친구들이 남긴 평가를 모아 평균 별점이 높은 순서로 보여 줘요.</p>

      {loading && <Loading message="순위를 불러오는 중이에요…" />}
      {error && <ErrorMessage message={error} onRetry={reload} />}
      {data && !loading &&
        (data.length === 0 ? (
          <EmptyState message="아직 순위를 낼 평가가 없어요">
            <Button to="/">오늘 급식 평가하러 가기</Button>
          </EmptyState>
        ) : (
          <RankingTable items={data} />
        ))}
    </section>
  );
}
