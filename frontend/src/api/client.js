// 진짜 서버를 부를 때 쓰는 공통 함수.
// 서버가 실패하면 { "message": "한 줄 오류 메시지" } 형태로 돌려준다고 가정한다 (명세서 5장).

const DEFAULT_ERROR = '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.';

export async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new Error('서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.');
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message || DEFAULT_ERROR);
  }
  return body;
}
