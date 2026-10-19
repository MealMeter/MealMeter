// 평가 한 건에 담기는 태그 항목 (명세서 3장 기능 2, 4장). 화면과 서버가 같은 값을 쓴다.
// key는 서버로 보내는 필드 이름, label은 화면에 보이는 이름이다.

export const TAG_FIELDS = [
  { key: 'saltiness', label: '간', options: ['짜다', '적당', '싱겁다'] },
  { key: 'portion', label: '양', options: ['많다', '적당', '적다'] },
  { key: 'temperature', label: '온도', options: ['뜨겁다', '적당', '차갑다'] },
  { key: 'texture', label: '식감', options: ['무름', '적당', '딱딱'] },
];

// 위생은 사고 신고 성격이라 다른 태그와 따로 다룬다.
export const HYGIENE_FIELD = { key: 'hygiene', label: '위생', options: ['문제 있음', '없음'] };
export const HYGIENE_PROBLEM = '문제 있음';

// 자유 의견 최대 글자 수 (명세서 제안값. 팀 회의에서 바뀌면 여기만 고친다)
export const COMMENT_MAX_LENGTH = 100;

// 식사 구분 (나이스 급식 API 식사코드)
export const MEAL_TYPES = { 1: '조식', 2: '중식', 3: '석식' };
export const DEFAULT_MEAL_CODE = 2;
