// 기존 Firestore 문서 구조를 유지하면서 관리자 세션을 서버에서 검증합니다.
export async function saveAdminCalendarDocument(documentId: string, data: Record<string, unknown>) {
  const response = await fetch('/api/admin/calendar-data', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId, data })
  });
  if (!response.ok) {
    throw new Error(response.status === 401 ? '관리자 로그인이 필요합니다.' : '서버 저장 실패');
  }
}
