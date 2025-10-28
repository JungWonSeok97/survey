import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

// SQLite 데이터베이스 연결
const dbPath = path.join(process.cwd(), 'data', 'survey.db');
const dbDir = path.dirname(dbPath);

// 데이터베이스 디렉토리 생성
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// 테이블 자동 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS survey_response (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    affiliation TEXT NOT NULL,
    job TEXT NOT NULL,
    years INTEGER NOT NULL,
    round INTEGER NOT NULL,
    questions TEXT NOT NULL,
    "savedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_survey_name_round ON survey_response(name, round);
`);

export default db;