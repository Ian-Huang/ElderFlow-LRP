/**
 * Cloudflare Pages Function: /api/sandbox/:collection
 *
 * 提供現場實驗室 (Frontline Lab) 通用動態集合的 Serverless REST API：
 * - GET    /api/sandbox/:collection       (讀取指定集合的所有文件)
 * - POST   /api/sandbox/:collection       (新增或覆寫指定文件)
 * - DELETE /api/sandbox/:collection?id=xx (刪除指定文件)
 *
 * 依靠 Cloudflare D1 儲存，免建專屬表格，JSON 結構隨開即用。
 */

interface Env {
  DB: D1Database;
}

interface D1Row {
  id: string;
  collection: string;
  data: string;
  created_at: string;
  updated_at: string;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// 支援 CORS Preflight
export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};

// GET: 讀取集合內所有文件
export const onRequestGet = async (context: {
  params: { collection: string };
  env: Env;
  request: Request;
}) => {
  const collection = context.params.collection;
  const db = context.env.DB;

  if (!db) {
    return jsonResponse(
      { success: false, error: 'Database binding (DB) is not configured.' },
      503
    );
  }

  try {
    const url = new URL(context.request.url);
    const limit = Math.min(Number(url.searchParams.get('limit')) || 200, 500);

    const query = `
      SELECT id, collection, data, created_at, updated_at
      FROM sandbox_documents
      WHERE collection = ?
      ORDER BY updated_at DESC
      LIMIT ?
    `;

    const { results } = await db.prepare(query).bind(collection, limit).all<D1Row>();

    const items = (results || []).map((row) => {
      let parsedPayload: Record<string, unknown> = {};
      try {
        parsedPayload = JSON.parse(row.data);
      } catch {
        parsedPayload = { raw: row.data };
      }

      return {
        id: row.id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ...parsedPayload,
      };
    });

    return jsonResponse({
      success: true,
      collection,
      count: items.length,
      data: items,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ success: false, error: message }, 500);
  }
};

// POST: 新增或更新文件
export const onRequestPost = async (context: {
  params: { collection: string };
  env: Env;
  request: Request;
}) => {
  const collection = context.params.collection;
  const db = context.env.DB;

  if (!db) {
    return jsonResponse(
      { success: false, error: 'Database binding (DB) is not configured.' },
      503
    );
  }

  try {
    const body = (await context.request.json()) as Record<string, unknown>;
    const now = new Date().toISOString();

    const id = (body.id as string) || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sb_${Date.now()}`);
    const createdAt = (body.createdAt as string) || now;
    const updatedAt = (body.updatedAt as string) || now;

    // 分離 meta 欄位與業務 payload
    const { id: _id, createdAt: _c, updatedAt: _u, ...restPayload } = body;
    const dataString = JSON.stringify(body.payload ?? restPayload);

    const query = `
      INSERT INTO sandbox_documents (id, collection, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        data = excluded.data,
        updated_at = excluded.updated_at
    `;

    await db.prepare(query).bind(id, collection, dataString, createdAt, updatedAt).run();

    return jsonResponse({
      success: true,
      id,
      collection,
      updatedAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ success: false, error: message }, 500);
  }
};

// DELETE: 依 id 刪除文件
export const onRequestDelete = async (context: {
  params: { collection: string };
  env: Env;
  request: Request;
}) => {
  const collection = context.params.collection;
  const db = context.env.DB;

  if (!db) {
    return jsonResponse(
      { success: false, error: 'Database binding (DB) is not configured.' },
      503
    );
  }

  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return jsonResponse({ success: false, error: 'Query parameter "id" is required.' }, 400);
    }

    const query = `
      DELETE FROM sandbox_documents
      WHERE collection = ? AND id = ?
    `;

    await db.prepare(query).bind(collection, id).run();

    return jsonResponse({
      success: true,
      deletedId: id,
      collection,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ success: false, error: message }, 500);
  }
};
