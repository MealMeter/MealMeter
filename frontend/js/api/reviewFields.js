// 역할: 평가 한 건에 담기는 태그 항목·의견 글자 수·식사 구분 상수 (명세서 3장 기능 2, 4장). 화면과 서버가 같은 값을 쓴다. 담당: 조현우
// key는 서버로 보내는 필드 이름, label은 화면에 보이는 이름이다.

// [문법] export const: 바꾸지 않는 값(상수)을 내보낸다. 다른 파일에서 import { TAG_FIELDS } 로 쓴다
// [문법] [ { ... }, ... ]: 객체들이 들어 있는 배열. 각 객체가 태그 항목 하나(key, label, options)
export const TAG_FIELDS = [
  // [문법] options: ['짜다', ...]: 고를 수 있는 값 목록(문자열 배열)
  { key: 'saltiness', label: '간', options: ['짜다', '적당', '싱겁다'] },
  { key: 'portion', label: '양', options: ['많다', '적당', '적다'] },
  { key: 'temperature', label: '온도', options: ['뜨겁다', '적당', '차갑다'] },
  { key: 'texture', label: '식감', options: ['무름', '적당', '딱딱'] },
];

// 위생은 사고 신고 성격이라 다른 태그와 따로 다룬다.
// [문법] 객체 하나짜리 상수. HYGIENE_FIELD.label 처럼 점으로 꺼내 쓴다
export const HYGIENE_FIELD = { key: 'hygiene', label: '위생', options: ['문제 있음', '없음'] };
export const HYGIENE_PROBLEM = '문제 있음';

// 자유 의견 최대 글자 수 (명세서 제안값. 팀 회의에서 바뀌면 여기만 고친다)
// [문법] 숫자 상수. 의견 입력창 최대 글자 수와 검사에 같이 쓴다
export const COMMENT_MAX_LENGTH = 100;

// 식사 구분 (나이스 급식 API 식사코드)
// [문법] { 1: '조식', ... }: 숫자처럼 보이는 키를 가진 객체. MEAL_TYPES[2] → '중식'
// [문법] (객체의 키는 사실 문자열 '1', '2'로 저장되지만, MEAL_TYPES[2]처럼 숫자로 꺼내도 된다)
export const MEAL_TYPES = { 1: '조식', 2: '중식', 3: '석식' };
export const DEFAULT_MEAL_CODE = 2;

// 별점마다 붙는 말 (화면 전용. 서버로 보내지 않아서 app/rules.py에는 없다). RATING_LABELS[4] → '좋아요'
// [문법] 배열 첫 칸('')은 0점 자리라서 비워 둔다. 그래야 RATING_LABELS[별점]으로 바로 꺼낼 수 있다
export const RATING_LABELS = ['', '별로예요', '아쉬워요', '보통이에요', '좋아요', '최고예요'];
