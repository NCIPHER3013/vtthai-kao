import { q, api } from './convex';

/**
 * Standardized Database Table Testing Utility
 * Use this to verify if tables exist and are accessible, preventing silent errors.
 */

export interface TestResult {
  tableName: string;
  status: 'passed' | 'missing_table' | 'rls_error' | 'unknown_error';
  message: string;
}

export const runDatabaseDiagnostics = async (tablesToTest: string[]): Promise<TestResult[]> => {
  try {
    const rows = await q(api.posInventory.diagnostics, { tables: tablesToTest });
    return rows.map((r): TestResult => ({
      tableName: r.table,
      status: r.status === 'ok' ? 'passed' : r.status === 'missing' ? 'missing_table' : 'unknown_error',
      message: r.message,
    }));
  } catch (err: any) {
    const msg = String(err?.message || 'Network/Exception error');
    const denied = msg.includes('UNAUTHORIZED') || msg.includes('FORBIDDEN');
    return tablesToTest.map((tableName): TestResult => ({
      tableName,
      status: denied ? 'rls_error' : 'unknown_error',
      message: denied ? 'Access denied: please sign in as a manager/admin.' : msg,
    }));
  }
};
