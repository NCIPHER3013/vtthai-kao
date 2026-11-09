// DbError: every Convex failure surfaced by q()/m() is converted into this class so pages can keep using
// `err instanceof DbError ? err.userMessage : ...`. Backend error messages look like "CODE: detail".
export class DbError extends Error {
  code: string;
  details: string | null;
  hint: string | null;
  tableName?: string;
  operation?: string;

  constructor(err: unknown, tableName?: string, operation?: string) {
    const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : String((err as any)?.message ?? err);
    const m = raw.match(/Uncaught Error: ([^\n]+)/);
    const message = (m ? m[1] : raw).trim();
    super(message);
    this.name = 'DbError';
    const codeMatch = message.match(/^([A-Z][A-Z0-9_]+)(?::|$)/);
    this.code = codeMatch ? codeMatch[1] : '';
    const idx = message.indexOf(': ');
    this.details = codeMatch && idx > -1 ? message.slice(idx + 2) : null;
    this.hint = null;
    this.tableName = tableName;
    this.operation = operation;
  }

  get isMissingTable(): boolean {
    return false;
  }

  get isRlsBlocked(): boolean {
    return this.code === 'UNAUTHORIZED' || this.code === 'FORBIDDEN';
  }

  get isNotFound(): boolean {
    return this.code === 'NOT_FOUND';
  }

  get isDuplicate(): boolean {
    return this.code.startsWith('DUPLICATE');
  }

  get isForeignKeyViolation(): boolean {
    return false;
  }

  get userMessage(): string {
    switch (this.code) {
      case 'UNAUTHORIZED':
        return 'กรุณาเข้าสู่ระบบใหม่';
      case 'FORBIDDEN':
        return 'ไม่มีสิทธิ์ใช้งานส่วนนี้';
      case 'NOT_FOUND':
        return 'ไม่พบข้อมูลที่ต้องการ';
      case 'DUPLICATE_PIN':
        return 'PIN นี้ถูกใช้แล้ว';
      case 'DUPLICATE_SLUG':
        return 'Slug นี้ถูกใช้แล้ว';
      case 'DUPLICATE_CODE':
        return 'รหัสซ้ำ — มีอยู่ในระบบแล้ว';
      case 'INSUFFICIENT_STOCK':
        return `สต็อกไม่พอ${this.details ? `: ${this.details}` : ''}`;
      default:
        if (this.isDuplicate) return 'ข้อมูลซ้ำ — มีอยู่ในระบบแล้ว';
        return this.message || 'เกิดข้อผิดพลาดกับฐานข้อมูล';
    }
  }
}

export function isDbError(error: unknown): error is DbError {
  return error instanceof DbError;
}
