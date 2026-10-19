// 순위 표. 담당: 조현우
// TODO(팀 회의): 평가가 1~2개뿐인 메뉴 처리 방식이 정해지면 "평가 부족" 표시 등을 여기에 추가한다.
import { HYGIENE_FIELD, HYGIENE_PROBLEM } from '../../api/reviewFields.js';
import StarRating from '../../components/ui/StarRating.jsx';
import TagBadge from '../../components/ui/TagBadge.jsx';

export default function RankingTable({ items }) {
  return (
    <div className="ranking-table__wrap">
      <table className="ranking-table">
        <caption className="sr-only">인기 메뉴 순위</caption>
        <thead>
          <tr>
            <th scope="col">순위</th>
            <th scope="col">메뉴</th>
            <th scope="col">평균 별점</th>
            <th scope="col">평가 수</th>
            <th scope="col">많이 고른 태그</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.name}>
              <td className="ranking-table__rank">{item.rank}위</td>
              <th scope="row">{item.name}</th>
              <td>
                <StarRating value={item.averageRating} />
              </td>
              <td>{item.reviewCount}개</td>
              <td>
                <div className="ranking-table__tags">
                  {item.topTags.map((tag) => (
                    <TagBadge
                      key={tag.category}
                      category={tag.category}
                      value={tag.value}
                      warning={tag.category === HYGIENE_FIELD.label && tag.value === HYGIENE_PROBLEM}
                    />
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
