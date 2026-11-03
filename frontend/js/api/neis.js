// 역할: 나이스 교육정보 개방 포털의 급식 API를 직접 불러 칼로리·영양소·알레르기 정보를 가져온다. 담당: 조현우
// 메뉴 번호(menuId)와 평가는 우리 서버(MealMeter-BE)가 주고, 서버가 주지 않는 칼로리·영양소·알레르기만 여기서 채운다.
// 나이스는 브라우저에서 바로 부를 수 있다 (CORS 허용). 페이지에서는 js/api/index.js의 getMealInfo()로 부른다.
// 인증키(VITE_NEIS_API_KEY)는 없어도 되지만 하루 호출 수가 제한된다 (.env.example 참고).

// [문법] const: 바꾸지 않는 값. 나이스 급식 API 주소
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
// [문법] export: 다른 파일(index.js, main.js 등)에서 import 해서 쓸 수 있게 내보낸다
export function cleanDishName(raw) {
  // [문법] 문자열.replace(정규식, '바꿀 글자'): 패턴에 맞는 부분을 바꾼다. 두 번 이어서 부르고 .trim()으로 앞뒤 공백을 지운다
  // [문법] 정규식 /\s*\([\d.\s]*\)/g: \s* = 공백 0개 이상, \( \) = 괄호 글자 자체, [\d.\s]* = 숫자·점·공백 0개 이상, g = 전부
  // [문법] /[*#&@]+/g: 대괄호 안 기호 중 하나가 1개 이상(+) 이어진 부분
  return raw.replace(/\s*\([\d.\s]*\)/g, '').replace(/[*#&@]+/g, '').trim();
}

// "닭갈비 (1.2.5.)" → ['난류', '우유', '대두']
// [문법] export가 없어서 이 파일 안에서만 쓰는 함수
function allergiesOf(raw) {
  // [문법] 문자열.match(정규식): 맞는 부분을 배열로 돌려준다(없으면 null). ( ) 안은 '그룹'이라 match[1]로 따로 꺼낼 수 있다
  const match = raw.match(/\(([\d.\s]+)\)/);
  // [문법] null은 거짓 취급이라 !match 는 '못 찾았으면'
  if (!match) return [];
  // [문법] match[1]: 괄호 그룹에 걸린 글자(예: '1.2.5.') → split('.')으로 자르고 → map으로 이름으로 바꾸고
  // [문법] .filter(Boolean): Boolean 함수를 넘겨 빈 글자·undefined 같은 거짓 값을 걸러 낸다
  return match[1]
    .split('.')
    .map((text) => ALLERGIES[Number(text)])
    .filter(Boolean);
}

// "탄수화물(g) : 118.2<br/>단백질(g) : 39.8<br/>..." 에서 숫자 하나 꺼내기. 없으면 null
function nutrient(info, name) {
  // [문법] new RegExp(문자열): 글자로 정규식을 만든다. 템플릿 리터럴로 영양소 이름(name)을 끼워 넣으려고 이렇게 쓴다
  // [문법] 문자열 안에서는 \ 를 두 번(\\) 써야 정규식에 \ 하나가 들어간다
  const match = String(info || '').match(new RegExp(`${name}\\(g\\)\\s*:\\s*([\\d.]+)`));
  // [문법] 찾았으면 숫자로 바꿔 돌려주고, 없으면 null(값 없음)
  return match ? Number(match[1]) : null;
}

// 나이스 응답의 한 줄(한 끼) → { kcal, carb, protein, fat, dishes: [{ name, allergies }] }
function parseRow(row) {
  // [문법] parseFloat('812.3 Kcal'): 글자 앞쪽의 소수를 숫자로 읽는다(뒤 글자는 무시) → 812.3
  const kcal = parseFloat(row.CAL_INFO);
  return {
    // [문법] Number.isNaN(값): 숫자가 아님(NaN)인지 확인. 못 읽었으면 null
    kcal: Number.isNaN(kcal) ? null : kcal,
    carb: nutrient(row.NTR_INFO, '탄수화물'),
    protein: nutrient(row.NTR_INFO, '단백질'),
    fat: nutrient(row.NTR_INFO, '지방'),
    // [문법] .split(/<br\s*\/?>/i): '<br>', '<br/>', '<br />' 어느 것이든 기준으로 자른다. i = 대소문자 무시
    // [문법] .map((raw) => ({ ... })): 각 줄을 { name, allergies } 객체로. 객체를 바로 돌려주려고 ( )로 감쌌다
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
// [문법] async function: 안에서 await로 네트워크 응답을 기다리는 비동기 함수
export async function fetchMealInfo(date) {
  // 나이스에 보낼 조건: 교육청 코드, 학교 코드, 날짜("20261027" 모양)
  // [문법] new URLSearchParams(객체): 주소 뒤 ?이름=값&이름=값 쿼리 문자열을 만들어 주는 도구
  const params = new URLSearchParams({
    Type: 'json',
    ATPT_OFCDC_SC_CODE: OFFICE_CODE,
    SD_SCHUL_CODE: SCHOOL_CODE,
    // [문법] replaceAll('-', ''): 모든 '-'를 지운다 → '20261027'
    MLSV_YMD: date.replaceAll('-', ''),
  });
  // [문법] set(이름, 값): 쿼리 값을 추가하거나 바꾼다. 키가 있을 때만 붙인다
  if (API_KEY) params.set('KEY', API_KEY);

  let payload;
  try {
    // [문법] `${params}`: URLSearchParams가 자동으로 'a=1&b=2' 글자가 된다
    const response = await fetch(`${NEIS_URL}?${params}`);
    // [문법] 응답 본문을 JSON 객체로 읽는다
    payload = await response.json();
  } catch {
    throw new Error('나이스 급식 정보를 불러오지 못했어요.');
  }

  // 데이터가 없으면 { RESULT: { CODE: "INFO-200" } } 로 온다
  if (!payload.mealServiceDietInfo) {
    // [문법] payload.RESULT?.CODE: RESULT가 없어도 오류 없이 undefined(옵셔널 체이닝)
    if (payload.RESULT?.CODE === 'INFO-200') return {};
    throw new Error('나이스 급식 정보를 불러오지 못했어요.');
  }

  // [문법] [1]: 배열 두 번째 칸. ?.row ?? []: 없으면 빈 배열
  const rows = payload.mealServiceDietInfo[1]?.row ?? [];
  // [문법] Object.fromEntries([[키, 값], ...]): [키, 값] 쌍 배열을 객체로 바꾼다 → { 1: 조식정보, 2: 중식정보 }
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
// [문법] meal?.dishes: meal이 null이어도 오류 없이 undefined → 끝의 ?? null 로 null을 돌려준다
export function findDish(meal, name) {
  return meal?.dishes.find((dish) => dish.name === name) ?? null;
}
