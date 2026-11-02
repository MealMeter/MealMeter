// 역할: 진짜 서버를 부를 때 쓰는 공통 fetch 함수. 실패하면 서버 메시지를 담은 Error를 던진다.
// 서버가 실패하면 { "message": "한 줄 오류 메시지" } 형태로 돌려준다고 가정한다 (명세서 5장).

const DEFAULT_ERROR = '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.';

// path: '/api/ranking' 같은 주소, options: fetch에 그대로 넘길 설정 (예: { method: 'POST', body })
// 성공하면 서버가 준 JSON을 객체로 돌려주고, 실패하면 화면에 그대로 보여 줄 한국어 메시지로 Error를 던진다
export async function request(path, options = {}) {
  let response;
  // 1) 서버에 요청 보내기. 여기서 실패하면 인터넷이 끊겼거나 서버가 꺼진 것이다
  try {
    response = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new Error('서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.');
  }

  // 본문이 JSON이 아니면(깨진 응답 등) INVALID로 표시해 둔다
  const INVALID = Symbol('invalid');
  const body = await response.json().catch(() => INVALID);
  if (!response.ok) {
    throw new Error((body !== INVALID && body?.message) || DEFAULT_ERROR);
  }
  // 성공 응답인데 JSON이 깨졌으면 오류로 알려 준다 (그냥 넘기면 화면이 "불러오는 중"에 멈춘다)
  if (body === INVALID) {
    throw new Error('서버 응답을 읽지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
  return body;
}
