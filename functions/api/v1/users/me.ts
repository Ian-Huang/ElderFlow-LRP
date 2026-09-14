const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With',
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
};

export const onRequestGet = async ({ request }: { request: Request }) => {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer mock-access-')) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: '未授權' } }),
      { status: 401, headers: corsHeaders }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        userId: 'user-003',
        username: 'admin1',
        name: '張管理員',
        role: 'admin',
        isLocalStaff: false,
        isActive: true,
        status: 'active',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req_${Date.now()}`,
      },
    }),
    { status: 200, headers: corsHeaders }
  );
};
