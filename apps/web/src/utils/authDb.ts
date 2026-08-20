import Dexie, { Table } from 'dexie';
import type { User, SwitchableUser } from '@lrp/shared';

interface StoredAuthData {
  id: string; // 'current'
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  userRole: User['role'] | null;
  isAuthenticated: boolean;
}

interface StoredSwitchableUser {
  userId: string;
  username: string;
  name: string;
  role: User['role'];
  encryptedRefreshToken: string;
  lastUsedAt: string;
}

class AuthDatabase extends Dexie {
  authData!: Table<StoredAuthData, string>;
  switchableUsers!: Table<StoredSwitchableUser, string>;

  constructor() {
    super('LRPAuthDB');
    this.version(1).stores({
      authData: 'id',
      switchableUsers: 'userId, lastUsedAt',
    });
  }
}

export const authDb = new AuthDatabase();

// Auth data operations
export async function saveAuthData(data: Omit<StoredAuthData, 'id'>) {
  await authDb.authData.put({ id: 'current', ...data });
}

export async function loadAuthData(): Promise<StoredAuthData | undefined> {
  return authDb.authData.get('current');
}

export async function clearAuthData() {
  await authDb.authData.clear();
  await authDb.switchableUsers.clear();
}

// Switchable users operations
export async function saveSwitchableUser(user: SwitchableUser) {
  await authDb.switchableUsers.put({
    userId: user.userId,
    username: user.username,
    name: user.name,
    role: user.role,
    encryptedRefreshToken: user.encryptedRefreshToken,
    lastUsedAt: user.lastUsedAt,
  });
}

export async function saveSwitchableUsers(users: SwitchableUser[]) {
  await authDb.switchableUsers.clear();
  await authDb.switchableUsers.bulkPut(
    users.map((u) => ({
      userId: u.userId,
      username: u.username,
      name: u.name,
      role: u.role,
      encryptedRefreshToken: u.encryptedRefreshToken,
      lastUsedAt: u.lastUsedAt,
    }))
  );
}

export async function loadSwitchableUsers(): Promise<SwitchableUser[]> {
  const users = await authDb.switchableUsers
    .orderBy('lastUsedAt')
    .reverse()
    .limit(5)
    .toArray();
  return users.map((u) => ({
    userId: u.userId,
    username: u.username,
    name: u.name,
    role: u.role,
    encryptedRefreshToken: u.encryptedRefreshToken,
    lastUsedAt: u.lastUsedAt,
  }));
}

export async function removeSwitchableUser(userId: string) {
  await authDb.switchableUsers.delete(userId);
}

export async function updateSwitchableUserLastUsed(userId: string) {
  await authDb.switchableUsers.update(userId, { lastUsedAt: new Date().toISOString() });
}