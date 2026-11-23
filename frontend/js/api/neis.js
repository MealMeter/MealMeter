// 역할: 나이스 교육정보 개방 포털의 급식 API를 직접 불러 칼로리·영양소·알레르기 정보를 가져온다. 담당: 조현우
// 메뉴 번호(menuId)와 평가는 우리 서버(MealMeter-BE)가 주고, 서버가 주지 않는 칼로리·영양소·알레르기만 여기서 채운다.
// 나이스는 브라우저에서 바로 부를 수 있다 (CORS 허용). 페이지에서는 js/api/index.js의 getMealInfo()로 부른다.
// 인증키(VITE_NEIS_API_KEY)는 없어도 되지만 하루 호출 수가 제한된다 (.env.example 참고).

// 나이스 급식 API 주소
const NEIS_URL = 'https://open.neis.go.kr/hub/mealServiceDietInfo';
// 대전광역시교육청 / 대덕소프트웨어마이스터고 (MealMeter-BE app/config.py와 같은 값)
const OFFICE_CODE = 'G10';
const SCHOOL_CODE = '7430310';
// [문법] import.meta.env.VITE_…: Vite가 .env 값을 넣어 주는 자리. || '' : 값이 없으면 빈 글자
const API_KEY = import.meta.env.VITE_NEIS_API_KEY || '';

// 나이스 알레르기 번호 → 이름 (메뉴 이름 뒤 괄호 숫자, 예: "닭갈비 (5.6.13)")
// [문법] 배열 첫 칸('')은 0번 자리라 비워 둔다. ALLERGIES[5] → '대두'
const ALLERGIES = [
  '', '난류', '우유', '메밀', '땅콩', '대두', '밀', '고등어', '게', '새우', '돼지고기',
  '복숭아', '토마토', '아황산류', '호두', '닭고기', '쇠고기', '오징어', '조개류', '잣',
];

// 메뉴 이름 정리. 서버(app/neis.py의 clean_dish_name)와 똑같이 지워야 서버 메뉴와 이름이 맞는다.
// "닭갈비 (1.2.5.)" → "닭갈비", 괄호 안 숫자는 알레르기 번호, *·# 등은 학교별 표시
// [문법] 정규식 /\s*\([\d.\s]*\)/g: 공백 + 괄호 안에 숫자·점·공백만 있는 부분. g = 전부 찾기
// [문법] /[*#&@]+/g: * # & @ 기호가 이어진 부분. trim(): 앞뒤 공백 지우기
export function cleanDishName(raw) {
  let name = raw.replace(/\s*\([\d.\s]*\)/g, '');
  name = name.replace(/[*#&@]+/g, '');
  return name.trim();
}

// "닭갈비 (1.2.5.)" → ['난류', '우유', '대두']
function allergiesOf(raw) {
  // [문법] 문자열.match(정규식): 맞는 부분을 배열로 돌려준다(없으면 null). ( ) 안 글자는 match[1]로 꺼낸다
  const match = raw.match(/\(([\d.\s]+)\)/);
  if (!match) return [];

  // '1.2.5.' → ['1', '2', '5', ''] → 번호마다 이름을 찾아 담는다
  const result = [];
  const numbers = match[1].split('.');
  for (const text of numbers) {
    const name = ALLERGIES[Number(text)];
    // 빈 칸('')이나 없는 번호(undefined)는 빼고 담는다
    if (name) result.push(name);
  }
  return result;
}

// "탄수화물(g) : 118.2<br/>단백질(g) : 39.8<br/>..." 에서 숫자 하나 꺼내기. 없으면 null
function nutrient(info, name) {
  const text = String(info || '');
  const label = `${name}(g)`;
  // [문법] 문자열.indexOf(찾을글자): 처음 나오는 위치 번호(없으면 -1)
  const start = text.indexOf(label);
  if (start === -1) return null;

  // 이름 뒤쪽 글자에서 ':' 다음 숫자를 읽는다. 예: ' : 118.2<br/>...' → 118.2
  // [문법] slice(시작): 시작 번호부터 끝까지 잘라 낸 글자
  const rest = text.slice(start + label.length).trim();
  if (rest[0] !== ':') return null;
  // [문법] parseFloat('118.2<br/>'): 앞쪽 숫자만 읽는다. 못 읽으면 NaN
  const value = parseFloat(rest.slice(1));
  if (Number.isNaN(value)) return null;
  return value;
}

// 나이스 응답의 한 줄(한 끼) → { kcal, carb, protein, fat, dishes: [{ name, allergies }] }
function parseRow(row) {
  // [문법] parseFloat('812.3 Kcal'): 글자 앞쪽의 소수를 숫자로 읽는다 → 812.3
  let kcal = parseFloat(row.CAL_INFO);
  if (Number.isNaN(kcal)) kcal = null;

  // 메뉴 이름들은 '<br/>'로 이어져 온다. 하나씩 잘라서 이름과 알레르기를 담는다
  // [문법] /<br\s*\/?>/i: '<br>', '<br/>', '<br />' 어느 것이든. i = 대소문자 무시
  const dishes = [];
  const lines = String(row.DDISH_NM || '').split(/<br\s*\/?>/i);
  for (const raw of lines) {
    const name = cleanDishName(raw);
    if (name) {
      dishes.push({ name: name, allergies: allergiesOf(raw) });
    }
  }

  return {
    kcal: kcal,
    carb: nutrient(row.NTR_INFO, '탄수화물'),
    protein: nutrient(row.NTR_INFO, '단백질'),
    fat: nutrient(row.NTR_INFO, '지방'),
    dishes: dishes,
  };
}

/**
 * 그날 조식·중식·석식 정보를 한 번에 가져온다.
 * @param {string} date "2026-10-27"
 * @returns {Promise<Record<number, MealInfo>>} 식사 코드(1·2·3) → 정보. 급식이 없는 날은 빈 객체
 */
export async function fetchMealInfo(date) {
  // 나이스에 보낼 조건: 교육청 코드, 학교 코드, 날짜("20261027" 모양)
  // [문법] replaceAll('-', ''): 모든 '-'를 지운다 → '20261027'
  let url = `${NEIS_URL}?Type=json&ATPT_OFCDC_SC_CODE=${OFFICE_CODE}&SD_SCHUL_CODE=${SCHOOL_CODE}`
    + `&MLSV_YMD=${date.replaceAll('-', '')}`;
  // [문법] encodeURIComponent(값): 주소에 넣어도 안전한 글자로 바꾼다
  if (API_KEY) url += `&KEY=${encodeURIComponent(API_KEY)}`;

  let payload;
  try {
    const response = await fetch(url);
    payload = await response.json();
  } catch (err) {
    throw new Error('나이스 급식 정보를 불러오지 못했어요.');
  }

  // 데이터가 없으면 { RESULT: { CODE: "INFO-200" } } 로 온다
  if (!payload.mealServiceDietInfo) {
    if (payload.RESULT && payload.RESULT.CODE === 'INFO-200') return {};
    throw new Error('나이스 급식 정보를 불러오지 못했어요.');
  }

  // 급식 정보는 mealServiceDietInfo 배열의 두 번째 칸([1])의 row 안에 있다
  let rows = [];
  const second = payload.mealServiceDietInfo[1];
  if (second && second.row) rows = second.row;

  // { 1: 조식정보, 2: 중식정보, 3: 석식정보 } 모양으로 담는다
  const result = {};
  for (const row of rows) {
    result[Number(row.MMEAL_SC_CODE)] = parseRow(row);
  }
  return result;
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
// meal은 MealInfo 하나 (없으면 undefined나 null이어도 된다)
export function findDish(meal, name) {
  if (!meal) return null;
  for (const dish of meal.dishes) {
    if (dish.name === name) return dish;
  }
  return null;
}
