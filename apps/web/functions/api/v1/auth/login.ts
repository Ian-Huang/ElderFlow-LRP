interface MockUser {
  userId: string;
  username: string;
  name: string;
  role: string;
  isLocalStaff: boolean;
  avatarUrl?: string;
  lastLoginAt: string;
  createdAt: string;
  isActive: boolean;
  status: string;
}

const mockUsers: MockUser[] = [
  {
    userId: 'user-001',
    username: 'caregiver1',
    name: '陳照護',
    role: 'caregiver',
    isLocalStaff: true,
    lastLoginAt: new Date().toISOString(),
    createdAt: '2024-01-01T00:00:00Z',
    isActive: true,
    status: 'active',
  },
  {
    userId: 'user-001',
    username: 'carer1',
    name: '陳照護',
    role: 'caregiver',
    isLocalStaff: true,
    lastLoginAt: new Date().toISOString(),
    createdAt: '2024-01-01T00:00:00Z',
    isActive: true,
    status: 'active',
  },
  {
    userId: 'user-002',
    username: 'supervisor1',
    name: '林主管',
    role: 'supervisor',
    isLocalStaff: true,
    lastLoginAt: new Date().toISOString(),
    createdAt: '2024-01-01T00:00:00Z',
    isActive: true,
    status: 'active',
  },
  {
    userId: 'user-003',
    username: 'admin1',
    name: '張管理員',
    role: 'admin',
    isLocalStaff: false,
    lastLoginAt: new Date().toISOString(),
    createdAt: '2024-01-01T00:00:00Z',
    isActive: true,
    status: 'active',
  },
  {
    userId: 'user-004',
    username: 'sysadmin',
    name: '王系統管理員',
    role: 'sysadmin',
    isLocalStaff: true,
    lastLoginAt: new Date().toISOString(),
    createdAt: '2024-01-01T00:00:00Z',
    isActive: true,
    status: 'active',
  },
  {
    userId: 'user-004',
    username: 'sysadmin1',
    name: '王系統管理員',
    role: 'sysadmin',
    isLocalStaff: true,
    lastLoginAt: new Date().toISOString(),
    createdAt: '2024-01-01T00:00:00Z',
    isActive: true,
    status: 'active',
  },
];

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

export const onRequestPost = async ({ request }: { request: Request }) => {
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    const username = (body.username || '').trim();
    const password = body.password || '';

    const user = mockUsers.find((u) => u.username.toLowerCase() === username.toLowerCase());

    if (!user || password !== 'password123') {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: '帳號或密碼錯誤（密碼請輸入 password123）' },
        }),
        { status: 401, headers: corsHeaders }
      );
    }

    const uuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tok_${Date.now()}`;
    const tokens = {
      accessToken: `mock-access-${uuid}`,
      refreshToken: `mock-refresh-${uuid}`,
      expiresIn: 900,
    };

    const switchableUsers = [
      {
        userId: user.userId,
        username: user.username,
        name: user.name,
        role: user.role,
        encryptedRefreshToken: `enc-${tokens.refreshToken}`,
        lastUsedAt: new Date().toISOString(),
      },
    ];

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          tokens,
          user,
          switchableUsers,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: uuid,
        },
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ success: false, error: { message } }),
      { status: 500, headers: corsHeaders }
    );
  }
};
