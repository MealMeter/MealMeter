// 역할: 나이스 교육정보 개방 포털의 급식 API를 직접 불러 칼로리·영양소·알레르기 정보를 가져온다. 담당: 박준호
// 메뉴 번호(menuId)와 평가는 우리 서버(MealMeter-BE)가 주고, 서버가 주지 않는 칼로리·영양소·알레르기만 여기서 채운다.
// 나이스는 브라우저에서 바로 부를 수 있다 (CORS 허용). 페이지에서는 js/api/index.js의 getMealInfo()로 부른다.
// 인증키(VITE_NEIS_API_KEY)는 없어도 되지만 하루 호출 수가 제한된다 (.env.example 참고).

const NEIS_URL = 'https://open.neis.go.kr/hub/mealServiceDietInfo';
// 대전광역시교육청 / 대덕소프트웨어마이스터고 (MealMeter-BE app/config.py와 같은 값)
const OFFICE_CODE = 'G10';
const SCHOOL_CODE = '7430310';
const API_KEY = import.meta.env.VITE_NEIS_API_KEY || '';

// 나이스 알레르기 번호 → 이름 (메뉴 이름 뒤 괄호 숫자, 예: "닭갈비 (5.6.13)")
const ALLERGIES = [
  '', '난류', '우유', '메밀', '땅콩', '대두', '밀', '고등어', '게', '새우', '돼지고기',
  '복숭아', '토마토', '아황산류', '호두', '닭고기', '쇠고기', '오징어', '조개류', '잣',
];

// 메뉴 이름 정리. 서버(app/neis.py의 clean_dish_name)와 똑같이 지워야 서버 메뉴와 이름이 맞는다.
// "닭갈비 (1.2.5.)" → "닭갈비", 괄호 안 숫자는 알레르기 번호, *·# 등은 학교별 표시
export function cleanDishName(raw) {
  return raw.replace(/\s*\([\d.\s]*\)/g, '').replace(/[*#&@]+/g, '').trim();
}

// "닭갈비 (1.2.5.)" → ['난류', '우유', '대두']
function allergiesOf(raw) {
  const match = raw.match(/\(([\d.\s]+)\)/);
  if (!match) return [];
  return match[1]
    .split('.')
    .map((text) => ALLERGIES[Number(text)])
    .filter(Boolean);
}

// "탄수화물(g) : 118.2<br/>단백질(g) : 39.8<br/>..." 에서 숫자 하나 꺼내기. 없으면 null
function nutrient(info, name) {
  const match = String(info || '').match(new RegExp(`${name}\\(g\\)\\s*:\\s*([\\d.]+)`));
  return match ? Number(match[1]) : null;
}

// 나이스 응답의 한 줄(한 끼) → { kcal, carb, protein, fat, dishes: [{ name, allergies }] }
function parseRow(row) {
  const kcal = parseFloat(row.CAL_INFO);
  return {
    kcal: Number.isNaN(kcal) ? null : kcal,
    carb: nutrient(row.NTR_INFO, '탄수화물'),
    protein: nutrient(row.NTR_INFO, '단백질'),
    fat: nutrient(row.NTR_INFO, '지방'),
    dishes: String(row.DDISH_NM || '')
      .split(/<br\s*\/?>/i)
      .map((raw) => ({ name: cleanDishName(raw), allergies: allergiesOf(raw) }))
      .filter((dish) => dish.name),
  };
}

/**
 * 그날 조식·중식·석식 정보를 한 번에 가져온다.
 * @param {string} date "2026-10-27"
 * @returns {Promise<Record<number, MealInfo>>} 식사 코드(1·2·3) → 정보. 급식이 없는 날은 빈 객체
 */
export async function fetchMealInfo(date) {
  const params = new URLSearchParams({
    Type: 'json',
    ATPT_OFCDC_SC_CODE: OFFICE_CODE,
    SD_SCHUL_CODE: SCHOOL_CODE,
    MLSV_YMD: date.replaceAll('-', ''),
  });
  if (API_KEY) params.set('KEY', API_KEY);

  let payload;
  try {
    const response = await fetch(`${NEIS_URL}?${params}`);
    payload = await response.json();
  } catch {
    throw new Error('나이스 급식 정보를 불러오지 못했어요.');
  }

  // 데이터가 없으면 { RESULT: { CODE: "INFO-200" } } 로 온다
  if (!payload.mealServiceDietInfo) {
    if (payload.RESULT?.CODE === 'INFO-200') return {};
    throw new Error('나이스 급식 정보를 불러오지 못했어요.');
  }

  const rows = payload.mealServiceDietInfo[1]?.row ?? [];
  return Object.fromEntries(rows.map((row) => [Number(row.MMEAL_SC_CODE), parseRow(row)]));
}

/**
 * @typedef {object} MealInfo
 * @property {number|null} kcal 칼로리
 * @property {number|null} carb 탄수화물(g)
 * @property {number|null} protein 단백질(g)
 * @property {number|null} fat 지방(g)
 * @property {{ name: string, allergies: string[] }[]} dishes 메뉴 이름(서버와 같은 방식으로 정리됨)과 알레르기 유발 식품
 */

// 서버가 준 메뉴 이름으로 나이스 정보에서 그 메뉴를 찾는다. 못 찾으면 null
export function findDish(meal, name) {
  return meal?.dishes.find((dish) => dish.name === name) ?? null;
}
