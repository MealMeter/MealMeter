// ============================================================================
// 📄 neis.js — 나이스(교육청) 급식 API에서 칼로리·영양소·알레르기 가져오기       담당: 조현우
// ============================================================================
//
// 🤔 왜 이 파일이 따로 있을까?
//   메뉴 번호(menuId)와 평가는 우리 서버(MealMeter-BE)가 준다.
//   그런데 우리 서버는 칼로리·영양소·알레르기 정보는 주지 않는다.
//   그래서 그 정보만 "나이스 교육정보 개방 포털"에서 브라우저가 직접 받아 와서 덧붙인다.
//   (나이스는 다른 사이트에서 불러도 허락해 줘서(CORS 허용) 브라우저에서 바로 부를 수 있다)
//
// 📦 나이스가 주는 원래 데이터는 이렇게 지저분하다
//   DDISH_NM (메뉴 이름들) : "쌀밥<br/>닭갈비 (5.6.13)<br/>배추김치 (9.13)"
//   CAL_INFO (칼로리)      : "812.3 Kcal"
//   NTR_INFO (영양소)      : "탄수화물(g) : 118.2<br/>단백질(g) : 39.8<br/>지방(g) : 20.1<br/>..."
//   → 이 파일이 이걸 깔끔한 객체로 바꿔 준다:
//   { kcal: 812.3, carb: 118.2, protein: 39.8, fat: 20.1,
//     dishes: [ { name: '쌀밥', allergies: [] }, { name: '닭갈비', allergies: ['대두', '밀', '아황산류'] }, ... ] }
//
// 📦 이 파일이 내보내는 것
//   fetchMealInfo('2026-10-27') → { 1: 조식정보, 2: 중식정보, 3: 석식정보 }
//   findDish(그끼니정보, '닭갈비') → { name: '닭갈비', allergies: [...] } (없으면 null)
//   cleanDishName('닭갈비 (5.6.13)') → '닭갈비'
//   ※ 페이지에서는 fetchMealInfo를 직접 부르지 말고 api/index.js의 getMealInfo()를 쓴다(기억 상자 때문)
//
// 🔑 인증키(VITE_NEIS_API_KEY)는 없어도 동작하지만, 없으면 하루에 부를 수 있는 횟수가 적다 (.env.example 참고)
// ============================================================================

// 나이스 급식 API 주소 (여기에 조건을 붙여서 요청한다)
const NEIS_URL = 'https://open.neis.go.kr/hub/mealServiceDietInfo';

// 우리 학교를 가리키는 번호들: 대전광역시교육청(G10) / 대덕소프트웨어마이스터고(7430310)
// ⚠️ MealMeter-BE의 app/config.py와 같은 값이어야 한다 (다르면 다른 학교 급식이 나온다!)
const OFFICE_CODE = 'G10';
const SCHOOL_CODE = '7430310';

// 인증키. .env 파일에 VITE_NEIS_API_KEY=... 를 적어 두면 Vite가 여기에 넣어 준다
// [문법] import.meta.env.VITE_이름: Vite가 .env 파일의 값을 꽂아 주는 자리
// [문법] A || '': A가 없으면(undefined 등) 빈 글자 ''를 쓴다
const API_KEY = import.meta.env.VITE_NEIS_API_KEY || '';

// 알레르기 번호표. 나이스는 메뉴 이름 뒤 괄호에 번호만 적어 준다. 예) "닭갈비 (5.6.13)" = 5번, 6번, 13번
// 이 배열에서 그 번호 칸을 꺼내면 이름이 나온다: ALLERGIES[5] → '대두', ALLERGIES[6] → '밀'
// [문법] 배열은 0번 칸부터 시작한다. 알레르기 번호는 1번부터라서 0번 칸은 빈 글자('')로 채워 자리만 맞췄다
const ALLERGIES = [
  '', '난류', '우유', '메밀', '땅콩', '대두', '밀', '고등어', '게', '새우', '돼지고기',
  '복숭아', '토마토', '아황산류', '호두', '닭고기', '쇠고기', '오징어', '조개류', '잣',
];

// ----------------------------------------------------------------------------
// cleanDishName(raw) — 나이스 메뉴 이름에서 군더더기를 지운다
//
//   예) "닭갈비 (1.2.5.)" → "닭갈비"      (괄호 안 숫자 = 알레르기 번호)
//       "*쌀밥#"         → "쌀밥"        (* # & @ = 학교마다 붙이는 표시)
//
//   ⚠️ 매우 중요: 서버(MealMeter-BE app/neis.py의 clean_dish_name)와 "똑같이" 지워야 한다.
//      우리는 서버 메뉴와 나이스 메뉴를 "이름"으로 짝지어서 알레르기를 찾는데,
//      지우는 방식이 조금이라도 다르면 이름이 안 맞아서 알레르기가 안 보이게 된다.
// ----------------------------------------------------------------------------
// [문법] 정규식(/.../): 글자 "패턴"을 찾는 도구. 문자열.replace(정규식, '')는 패턴에 맞는 부분을 지운다
//   /\s*\([\d.\s]*\)/g 읽는 법:
//     \s*        공백이 0개 이상
//     \(  \)     괄호 글자 ( ) 자체 (앞에 \ 를 붙여야 진짜 괄호 글자로 본다)
//     [\d.\s]*   그 안에 숫자(\d)·점(.)·공백(\s)만 0개 이상
//     g          처음 하나만이 아니라 전부(global)
//   /[*#&@]+/g : * # & @ 중 하나가 1개 이상(+) 이어진 부분
//   trim()     : 앞뒤 공백 지우기
export function cleanDishName(raw) {
  let name = raw.replace(/\s*\([\d.\s]*\)/g, ''); // "닭갈비 (1.2.5.)" → "닭갈비"
  name = name.replace(/[*#&@]+/g, ''); // "*쌀밥#" → "쌀밥"
  return name.trim(); // "  쌀밥 " → "쌀밥"
}

// ----------------------------------------------------------------------------
// allergiesOf(raw) — 메뉴 이름 뒤 괄호 번호를 알레르기 이름 목록으로 바꾼다
//
//   예) "닭갈비 (1.2.5.)" → ['난류', '우유', '대두']
//       "쌀밥"            → []   (괄호가 없으면 빈 목록)
//
//   흐름: 괄호 안 글자 꺼내기 '1.2.5.' → 점으로 자르기 ['1','2','5',''] → 번호표에서 이름 찾기
// ----------------------------------------------------------------------------
function allergiesOf(raw) {
  // 괄호 안에 숫자·점·공백만 있는 부분을 찾는다
  // [문법] 문자열.match(정규식): 찾으면 배열, 못 찾으면 null을 돌려준다
  //        정규식 안에서 ( )로 한 번 더 감싼 부분은 match[1]에 따로 담긴다
  //        "닭갈비 (1.2.5.)" → match[0] = '(1.2.5.)', match[1] = '1.2.5.'
  const match = raw.match(/\(([\d.\s]+)\)/);
  // 못 찾았으면(null) 알레르기 없음
  if (!match) return [];

  const result = []; // 찾은 알레르기 이름을 하나씩 담을 빈 목록
  // [문법] 문자열.split('.'): 점을 기준으로 잘라서 배열로. '1.2.5.' → ['1', '2', '5', '']
  const numbers = match[1].split('.');
  for (const text of numbers) {
    // '5' → 숫자 5 → ALLERGIES[5] → '대두'
    // [문법] Number('5') → 5 (글자를 숫자로)
    const name = ALLERGIES[Number(text)];
    // 빈 칸('')이나 번호표에 없는 번호(undefined)는 거짓이라 건너뛰고, 진짜 이름만 담는다
    // [문법] 배열.push(값): 배열 맨 뒤에 값을 하나 추가한다
    if (name) result.push(name);
  }
  return result;
}

// ----------------------------------------------------------------------------
// nutrient(info, name) — 영양소 글자 덩어리에서 원하는 영양소 숫자 하나를 꺼낸다
//
//   info 예) "탄수화물(g) : 118.2<br/>단백질(g) : 39.8<br/>지방(g) : 20.1"
//   nutrient(info, '단백질') → 39.8
//   nutrient(info, '나트륨') → null   (없으면 null)
//
//   흐름: '단백질(g)' 위치 찾기 → 그 뒤 글자 ' : 39.8<br/>...' 가져오기 → ':' 확인 → 숫자 읽기
// ----------------------------------------------------------------------------
function nutrient(info, name) {
  // info가 없을 수도 있어서(null) 빈 글자로 바꿔 두면 아래에서 오류가 안 난다
  const text = String(info || '');
  const label = `${name}(g)`; // 찾을 글자. 예) '단백질(g)'

  // [문법] 문자열.indexOf('찾을글자'): 처음 나오는 위치(0부터 센 번호). 없으면 -1
  const start = text.indexOf(label);
  if (start === -1) return null; // 그 영양소가 아예 없음

  // 찾은 이름 바로 뒤부터 끝까지 잘라 낸다
  // 예) '단백질(g) : 39.8<br/>지방...' 에서 '단백질(g)' 뒤 → ' : 39.8<br/>지방...' → trim → ': 39.8<br/>지방...'
  // [문법] 문자열.slice(시작번호): 시작번호부터 끝까지 잘라 낸 새 글자
  const rest = text.slice(start + label.length).trim();
  // 이름 바로 다음이 ':' 가 아니면 우리가 아는 모양이 아니다
  // [문법] 문자열[0]: 첫 번째 글자
  if (rest[0] !== ':') return null;

  // ':' 다음 글자에서 숫자를 읽는다. ' 39.8<br/>지방...' → 39.8
  // [문법] parseFloat('39.8abc'): 앞에서부터 숫자로 읽을 수 있는 만큼만 읽는다(뒤 글자는 무시). 못 읽으면 NaN
  const value = parseFloat(rest.slice(1));
  // [문법] Number.isNaN(값): NaN(Not a Number = 숫자 아님)이면 true
  if (Number.isNaN(value)) return null;
  return value;
}

// ----------------------------------------------------------------------------
// parseRow(row) — 나이스 응답의 "한 끼"를 깔끔한 객체로 바꾼다
//
//   row 예) { MMEAL_SC_CODE: '2', CAL_INFO: '812.3 Kcal',
//            NTR_INFO: '탄수화물(g) : 118.2<br/>...', DDISH_NM: '쌀밥<br/>닭갈비 (5.6.13)' }
//   결과  ) { kcal: 812.3, carb: 118.2, protein: ..., fat: ...,
//            dishes: [ { name: '쌀밥', allergies: [] }, { name: '닭갈비', allergies: ['대두','밀','아황산류'] } ] }
// ----------------------------------------------------------------------------
function parseRow(row) {
  // 칼로리: '812.3 Kcal' → 812.3. 못 읽으면 null(모름)
  let kcal = parseFloat(row.CAL_INFO);
  if (Number.isNaN(kcal)) kcal = null;

  // 메뉴 이름들은 '<br/>'로 줄바꿈되어 한 덩어리로 온다. 한 줄씩 잘라서 처리한다
  // [문법] /<br\s*\/?>/i : '<br>', '<br/>', '<br />', '<BR>' 어느 모양이든 다 찾는 패턴
  //        \s* = 공백 0개 이상, \/? = 슬래시가 있어도 되고 없어도 됨, i = 대소문자 무시
  const dishes = [];
  const lines = String(row.DDISH_NM || '').split(/<br\s*\/?>/i);
  for (const raw of lines) {
    const name = cleanDishName(raw); // '닭갈비 (5.6.13)' 같은 원래 글자 → '닭갈비'
    // 이름이 빈 글자면(빈 줄) 건너뛴다
    if (name) {
      // 알레르기는 괄호 번호가 남아 있는 원래 글자(raw)에서 꺼내야 한다
      dishes.push({ name: name, allergies: allergiesOf(raw) });
    }
  }

  // 깔끔하게 정리된 한 끼 정보를 돌려준다
  return {
    kcal: kcal,
    carb: nutrient(row.NTR_INFO, '탄수화물'),
    protein: nutrient(row.NTR_INFO, '단백질'),
    fat: nutrient(row.NTR_INFO, '지방'),
    dishes: dishes,
  };
}

/**
 * fetchMealInfo(date) — 그날 조식·중식·석식 정보를 나이스에서 한 번에 가져온다.
 *
 * 흐름: 요청 주소 만들기 → 나이스에 요청 → "급식 없음"인지 확인 → 끼니마다 parseRow로 정리
 *
 * @param {string} date "2026-10-27"
 * @returns {Promise<Record<number, MealInfo>>} 식사 코드(1·2·3) → 정보. 급식이 없는 날(주말 등)은 빈 객체 {}
 */
export async function fetchMealInfo(date) {
  // ── 1) 요청 주소 만들기 ─────────────────────────────────────────
  // 나이스에 알려 줄 조건: 형식(json), 교육청 코드, 학교 코드, 날짜(나이스는 '20261027'처럼 - 없이 받는다)
  // 완성 예) https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&ATPT_OFCDC_SC_CODE=G10&SD_SCHUL_CODE=7430310&MLSV_YMD=20261027
  // [문법] 문자열.replaceAll('-', ''): 모든 '-'를 빈 글자로 바꿔서(=지워서) '2026-10-27' → '20261027'
  // [문법] 긴 글자는 + 로 이어 붙여 두 줄에 나눠 쓸 수 있다
  let url = `${NEIS_URL}?Type=json&ATPT_OFCDC_SC_CODE=${OFFICE_CODE}&SD_SCHUL_CODE=${SCHOOL_CODE}`
    + `&MLSV_YMD=${date.replaceAll('-', '')}`;
  // 인증키가 있을 때만 주소 끝에 붙인다
  // [문법] encodeURIComponent(값): 주소에 넣으면 문제가 되는 글자(공백, &, 한글 등)를 안전한 모양으로 바꾼다
  // [문법] url += 글자: url = url + 글자 (뒤에 이어 붙이기)
  if (API_KEY) url += `&KEY=${encodeURIComponent(API_KEY)}`;

  // ── 2) 나이스에 요청하기 ────────────────────────────────────────
  let payload; // 나이스가 보낸 답장 객체를 담을 변수
  try {
    const response = await fetch(url); // 요청 보내고 답장 기다리기
    payload = await response.json(); // 답장 글자를 객체로 바꾸기
  } catch (err) {
    // 인터넷이 끊겼거나 나이스가 이상한 답장을 보낸 경우
    throw new Error('나이스 급식 정보를 불러오지 못했어요.');
  }

  // ── 3) 급식이 없는 날인지 확인 ──────────────────────────────────
  // 정상이면 payload.mealServiceDietInfo 가 있다.
  // 급식이 없는 날(주말·방학)은 그 대신 { RESULT: { CODE: "INFO-200" } } 만 온다 → 오류가 아니라 "없음"
  if (!payload.mealServiceDietInfo) {
    // RESULT가 있고 그 CODE가 'INFO-200'이면 → 빈 객체(급식 없음)
    if (payload.RESULT && payload.RESULT.CODE === 'INFO-200') return {};
    // 그 밖의 경우는 진짜 문제(잘못된 키 등)
    throw new Error('나이스 급식 정보를 불러오지 못했어요.');
  }

  // ── 4) 끼니 목록 꺼내기 ─────────────────────────────────────────
  // 나이스 답장 모양: { mealServiceDietInfo: [ {head 정보}, { row: [조식, 중식, 석식] } ] }
  // 끼니들은 배열 두 번째 칸([1])의 row 안에 들어 있다. 혹시 없으면 빈 목록으로 둔다
  let rows = [];
  const second = payload.mealServiceDietInfo[1];
  if (second && second.row) rows = second.row;

  // ── 5) { 식사코드: 정리된정보 } 모양으로 담기 ──────────────────
  // row.MMEAL_SC_CODE 가 끼니 번호('1' 조식, '2' 중식, '3' 석식)라서 그걸 이름표로 쓴다
  // 결과 예) { 1: {조식 정보}, 2: {중식 정보} }   (석식이 없는 날이면 3은 아예 없다)
  const result = {};
  for (const row of rows) {
    result[Number(row.MMEAL_SC_CODE)] = parseRow(row);
  }
  return result;
}

/**
 * MealInfo — 한 끼 정보의 모양 (fetchMealInfo가 돌려주는 객체의 값 하나)
 *
 * 나이스에 값이 없으면 숫자 대신 null이 들어 있다. (화면에서는 '-'로 보여 준다)
 *
 * @typedef {object} MealInfo
 * @property {number|null} kcal 칼로리
 * @property {number|null} carb 탄수화물(g)
 * @property {number|null} protein 단백질(g)
 * @property {number|null} fat 지방(g)
 * @property {{ name: string, allergies: string[] }[]} dishes 메뉴 이름(서버와 같은 방식으로 정리됨)과 알레르기 유발 식품
 */

// ----------------------------------------------------------------------------
// findDish(meal, name) — 한 끼 정보에서 이름이 같은 메뉴를 찾는다
//
//   meal: MealInfo 하나 (나이스 정보가 아직 없으면 null이나 undefined여도 괜찮다)
//   name: 우리 서버가 준 메뉴 이름. 예) '닭갈비'
//   돌려주는 값: { name: '닭갈비', allergies: [...] } 또는 못 찾으면 null
//
//   💡 우리 서버 메뉴와 나이스 메뉴를 이어 주는 다리 역할. 그래서 cleanDishName이 서버와 같아야 한다.
// ----------------------------------------------------------------------------
export function findDish(meal, name) {
  // 나이스 정보가 아예 없으면 찾을 것도 없다
  if (!meal) return null;
  // 메뉴를 하나씩 보면서 이름이 똑같은 걸 찾으면 바로 돌려준다
  for (const dish of meal.dishes) {
    // [문법] === : 값과 종류가 모두 같을 때 true (엄격한 비교)
    if (dish.name === name) return dish;
  }
  // 끝까지 봤는데 없으면 null
  return null;
}
