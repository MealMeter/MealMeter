// 역할: 진짜 서버를 부를 때 쓰는 공통 fetch 함수. 실패하면 서버 메시지를 담은 Error를 던진다. 담당: 조현우
// 서버가 실패하면 { "message": "한 줄 오류 메시지" } 형태로 돌려준다고 가정한다 (명세서 5장).

// [문법] const: 다시 대입할 수 없는 변수. 이 파일 안에서만 쓰는 기본 오류 문구
const DEFAULT_ERROR = '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.';

// path: '/api/ranking' 같은 주소, options: fetch에 그대로 넘길 설정 (예: { method: 'POST', body })
// 성공하면 서버가 준 JSON을 객체로 돌려주고, 실패하면 화면에 그대로 보여 줄 한국어 메시지로 Error를 던진다
// [문법] export async function: 내보내는 비동기 함수. 안에서 await를 쓰고, 부르면 Promise를 돌려준다
// [문법] options = {}: 기본 매개변수. 설정을 안 넘기면 빈 객체
export async function request(path, options = {}) {
  // [문법] let: 나중에 값을 넣을 변수. try 안에서 값을 넣고 밖에서도 쓰려고 미리 선언한다
  let response;
  // 1) 서버에 요청 보내기. 여기서 실패하면 인터넷이 끊겼거나 서버가 꺼진 것이다
  // [문법] try { } catch { }: try 안에서 오류가 나면 catch로 넘어간다
  try {
    // [문법] fetch(주소, 설정): 브라우저 내장 함수로 서버에 HTTP 요청을 보낸다. await로 응답이 올 때까지 기다린다
    // [문법] headers: 요청에 붙이는 정보. Content-Type: application/json = 보내는 본문이 JSON이라는 뜻
    // [문법] ...options: 객체 펼침. 넘겨받은 설정(method, body 등)을 그대로 덧붙인다(같은 키면 뒤쪽이 이긴다)
    response = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  // [문법] catch { }: 오류 내용(err)이 필요 없으면 괄호 없이 써도 된다
  } catch {
    // [문법] throw new Error('메시지'): 오류를 던진다. 부른 쪽의 try/catch(또는 loadData)가 받아서 메시지를 보여 준다
    throw new Error('서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.');
  }

  // 본문이 JSON이 아니면(깨진 응답 등) INVALID로 표시해 둔다
  // [문법] Symbol('설명'): 다른 어떤 값과도 같지 않은 유일한 값. '깨진 응답' 표시용으로 쓴다
  const INVALID = Symbol('invalid');
  // [문법] response.json(): 응답 본문을 JSON으로 읽어 객체로 바꾼다(Promise). 실패하면 .catch의 함수가 대신 INVALID를 돌려준다
  const body = await response.json().catch(() => INVALID);
  // [문법] response.ok: 상태 코드가 200~299면 true. ! 로 뒤집어 '실패했으면'
  if (!response.ok) {
    // [문법] (A && B) || C: A가 참이고 B가 있으면 B, 아니면 C. body?.message 는 옵셔널 체이닝(body가 없어도 오류 없음)
    // [문법] !== 는 '엄격하게 다르다'(값이나 자료형이 다르면 true)
    throw new Error((body !== INVALID && body?.message) || DEFAULT_ERROR);
  }
  // 성공 응답인데 JSON이 깨졌으면 오류로 알려 준다 (그냥 넘기면 화면이 "불러오는 중"에 멈춘다)
  if (body === INVALID) {
    throw new Error('서버 응답을 읽지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
  // [문법] return: 성공했을 때 서버가 준 객체를 돌려준다
  return body;
}
