import { requireToken } from "@/features/auth/auth.session"
import { api, ApiError } from "@/lib/api"
import type { SchemaInfo } from "./data-browser.entity"
import type {
  DatabaseBackup,
  DatabaseConnection,
  ManagedDatabase,
  ManagedDatabaseDetail,
} from "./managed-database.entity"

export async function listDatabases(
  projectId: string
): Promise<ManagedDatabase[]> {
  return api<ManagedDatabase[]>(`/databases?projectId=${projectId}`, {
    token: await requireToken(),
  })
}

export async function getDatabase(
  id: string
): Promise<ManagedDatabaseDetail | null> {
  try {
    return await api<ManagedDatabaseDetail>(`/databases/${id}`, {
      token: await requireToken(),
    })
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
      return null
    }
    throw err
  }
}

export async function getDatabaseCredentials(
  id: string
): Promise<DatabaseConnection> {
  return api<DatabaseConnection>(`/databases/${id}/credentials`, {
    token: await requireToken(),
  })
}

export async function listBackups(
  databaseId: string
): Promise<DatabaseBackup[]> {
  return api<DatabaseBackup[]>(`/databases/${databaseId}/backups`, {
    token: await requireToken(),
  })
}

/** Databases on the server (schemas/); empty for Redis or while the server is down. */
export async function listSchemas(databaseId: string): Promise<SchemaInfo[]> {
  try {
    return await api<SchemaInfo[]>(`/databases/${databaseId}/schemas`, {
      token: await requireToken(),
    })
  } catch {
    return []
  }
}
