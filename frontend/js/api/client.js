// 역할: 진짜 서버를 부를 때 쓰는 공통 fetch 함수. 실패하면 서버 메시지를 담은 Error를 던진다. 담당: 조현우
// 서버가 실패하면 { "message": "한 줄 오류 메시지" } 형태로 돌려준다고 가정한다 (명세서 5장).
//
// request('/api/ranking')                    → GET 요청
// request('/api/reviews', 'POST', 평가객체)  → 객체를 JSON 글자로 바꿔 보낸다

// [문법] const: 다시 대입할 수 없는 변수. 이 파일 안에서만 쓰는 기본 오류 문구
const DEFAULT_ERROR = '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.';

// path: '/api/ranking' 같은 주소, method: 'POST'·'PATCH' (안 넘기면 GET), data: 보낼 객체
// 성공하면 서버가 준 JSON을 객체로 돌려주고, 실패하면 화면에 그대로 보여 줄 한국어 메시지로 Error를 던진다
// [문법] export async function: 내보내는 비동기 함수. 안에서 await를 쓰고, 부르면 Promise를 돌려준다
export async function request(path, method, data) {
  // fetch에 넘길 설정. 보낼 내용이 있을 때만 method와 body를 채운다
  const settings = {
    headers: { 'Content-Type': 'application/json' },
  };
  // [문법] 인자를 안 넘기면 undefined라서 if 조건에서 거짓이 된다
  if (method) {
    settings.method = method;
  }
  if (data) {
    // [문법] JSON.stringify(객체): 객체를 JSON 글자로 바꾼다(서버로 보낼 수 있는 모양)
    settings.body = JSON.stringify(data);
  }

  // 1) 서버에 요청 보내기. 여기서 실패하면 인터넷이 끊겼거나 서버가 꺼진 것이다
  // [문법] let: 나중에 값을 넣을 변수. try 안에서 값을 넣고 밖에서도 쓰려고 미리 선언한다
  let response;
  // [문법] try { } catch (err) { }: try 안에서 오류가 나면 catch로 넘어간다
  try {
    // [문법] fetch(주소, 설정): 서버에 HTTP 요청을 보낸다. await로 응답이 올 때까지 기다린다
    response = await fetch(path, settings);
  } catch (err) {
    // [문법] throw new Error('메시지'): 오류를 던진다. 부른 쪽의 try/catch가 받아서 메시지를 보여 준다
    throw new Error('서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.');
  }

  // 2) 응답 본문을 JSON으로 읽기. 깨진 응답이면 broken을 true로 표시해 둔다
  let body = null;
  let broken = false;
  try {
    body = await response.json();
  } catch (err) {
    broken = true;
  }

  // 3) 실패 응답이면 서버가 보낸 메시지(없으면 기본 문구)로 오류를 던진다
  // [문법] response.ok: 상태 코드가 200~299면 true. ! 로 뒤집어 '실패했으면'
  if (!response.ok) {
    if (!broken && body && body.message) {
      throw new Error(body.message);
    }
    throw new Error(DEFAULT_ERROR);
  }
  // 성공 응답인데 JSON이 깨졌으면 오류로 알려 준다 (그냥 넘기면 화면이 "불러오는 중"에 멈춘다)
  if (broken) {
    throw new Error('서버 응답을 읽지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
  return body;
}
