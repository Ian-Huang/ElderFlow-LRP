const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With',
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
};

export const onRequestPost = async () => {
  const uuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tok_${Date.now()}`;
  return new Response(
    JSON.stringify({
      success: true,
      data: {
        accessToken: `mock-access-${uuid}`,
        expiresIn: 900,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: uuid,
      },
    }),
    { status: 200, headers: corsHeaders }
  );
};
