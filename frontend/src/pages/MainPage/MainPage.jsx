// 역할: 메인 페이지 (/) — 오늘의 메뉴 목록 (명세서 3장 기능 1). 담당: 김태건
// getTodayMenus()로 오늘 날짜·식사 구분·메뉴를 불러와 MenuCard로 보여 준다.
// 불러오는 중 / 오류 / 급식 없음은 components/state 부품으로 표시한다.

import { useEffect, useState } from "react";
import { getTodayMenus } from "../api/menus";                 // ← 경로 확인
import MenuCard from "../components/MenuCard";                 // ← 경로 확인
import Loading from "../components/state/Loading";             // ← 이름 확인
import ErrorMessage from "../components/state/ErrorMessage";   // ← 이름 확인
import Empty from "../components/state/Empty";                 // ← 이름 확인
import "./MainPage.css";

export default function MainPage() {
  const [data, setData] = useState(null); // { date, mealType, menus }
  const [status, setStatus] = useState("loading"); // loading | error | done

  const load = () => {
    setStatus("loading");
    getTodayMenus()
      .then((res) => {
        setData(res);
        setStatus("done");
      })
      .catch(() => setStatus("error"));
  };

  useEffect(load, []);

  if (status === "loading") return <Loading />;
  if (status === "error") return <ErrorMessage onRetry={load} />;

  const menus = data?.menus ?? [];
  if (menus.length === 0) return <Empty message="오늘은 급식이 없어요." />;

  const dateText = new Date(data.date).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <main className="main-page">
      <header className="main-page__head">
        <h1>오늘의 메뉴</h1>
        <span className="muted">{dateText}</span>
      </header>

      <section aria-label={`${data.mealType} 메뉴`}>
        <h2 className="small muted">{data.mealType} · {menus.length}가지</h2>
        <ul className="main-page__menus">
          {menus.map((menu) => (
            <MenuCard key={menu.menuId} menu={menu} />
          ))}
        </ul>
      </section>

      <p className="main-page__footer muted small">
        알레르기 정보와 칼로리는 나이스 교육정보 개방 포털의 대덕소프트웨어마이스터고 급식 정보를 따릅니다.
      </p>
    </main>
  );
}