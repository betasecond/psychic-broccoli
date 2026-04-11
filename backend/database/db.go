package database

import (
	"database/sql"
	"fmt"
	"os"

	"github.com/XSAM/otelsql"
	_ "github.com/mattn/go-sqlite3"
	"github.com/online-education-platform/backend/utils"
	semconv "go.opentelemetry.io/otel/semconv/v1.27.0"
	"go.uber.org/zap"
)

var DB *sql.DB

// InitDB 鍒濆鍖栨暟鎹簱杩炴帴
func InitDB(dbPath string) error {
	var err error

	// 鎵撳紑鏁版嵁搴撹繛鎺?(浣跨敤otelsql鍖呰)
	DB, err = otelsql.Open("sqlite3", dbPath,
		otelsql.WithAttributes(
			semconv.DBSystemSqlite,
		),
	)
	if err != nil {
		return fmt.Errorf("鏃犳硶鎵撳紑鏁版嵁搴? %v", err)
	}

	// 娉ㄥ唽DBStats Metrics
	if _, err := otelsql.RegisterDBStatsMetrics(DB, otelsql.WithAttributes(
		semconv.DBSystemSqlite,
	)); err != nil {
		utils.GetLogger().Warn("娉ㄥ唽鏁版嵁搴撴寚鏍囧け璐?, zap.Error(err))
	}

	// 娴嬭瘯杩炴帴
	if err = DB.Ping(); err != nil {
		return fmt.Errorf("鏃犳硶杩炴帴鍒版暟鎹簱: %v", err)
	}

	// 1. 鍏堟墽琛屽熀纭€寤鸿〃锛堝鏋滄槸绗竴娆￠儴缃诧紝杩欓噷浼氬垱寤烘墍鏈夎〃锛?
	schemaSQL, err := os.ReadFile("database/schema.sql")
	if err != nil {
		return fmt.Errorf("鏃犳硶璇诲彇schema.sql: %v", err)
	}
	if _, err = DB.Exec(string(schemaSQL)); err != nil {
		return fmt.Errorf("鏃犳硶鍒涘缓鏁版嵁搴撹〃: %v", err)
	}

	// 2. 鑷姩杩佺Щ閫昏緫锛氭鏌ュ苟琛ュ厖鐜版湁琛ㄤ腑缂哄け鐨勫垪
	// 杩欓噷鍒楀嚭鎵€鏈変綘鍚庢潵鏂板鐨勫瓧娈碉紝姣忔鍚姩閮戒細妫€鏌?
	if err := autoMigrate(); err != nil {
		return fmt.Errorf("鏁版嵁搴撹嚜鍔ㄨ縼绉诲け璐? %v", err)
	}

	utils.GetLogger().Info("鉁?鏁版嵁搴撳垵濮嬪寲鎴愬姛")
	return nil
}

// autoMigrate 闆嗕腑绠＄悊鎵€鏈夌殑鏁版嵁搴撳彉鏇?
func autoMigrate() error {

	// 1. assignments 琛?
	if err := addColumnIfNotExists("assignments", "attachments", "TEXT"); err != nil {
		return err
	}

	// 2. users 琛?- 蹇呴』鍔犱笂杩欓儴鍒嗘潵淇 full_name 缂哄け闂
	if err := addColumnIfNotExists("users", "full_name", "TEXT"); err != nil { return err }
	if err := addColumnIfNotExists("users", "phone", "TEXT"); err != nil { return err }
	if err := addColumnIfNotExists("users", "gender", "TEXT"); err != nil { return err }
	if err := addColumnIfNotExists("users", "bio", "TEXT"); err != nil { return err }

	// 3. discussions 琛?- 鏃х増鏈敤 author/course TEXT锛屾柊鐗堟湰闇€瑕?author_id/course_id/content
	// 鍏堣ˉ鍒楋紙鏂板垪涓?nullable锛屼笉浼氱牬鍧忔棫鏁版嵁锛?
	if err := addColumnIfNotExists("discussions", "author_id", "INTEGER"); err != nil { return err }
	if err := addColumnIfNotExists("discussions", "course_id", "INTEGER"); err != nil { return err }
	if err := addColumnIfNotExists("discussions", "content", "TEXT"); err != nil { return err }
	if err := addColumnIfNotExists("discussions", "last_reply_at", "DATETIME"); err != nil { return err }
	if err := addColumnIfNotExists("discussions", "updated_at", "DATETIME DEFAULT CURRENT_TIMESTAMP"); err != nil { return err }
	// 鍐嶉噸寤鸿〃锛岀Щ闄ゆ棫鐨?author/course TEXT NOT NULL 鍒楋紙鍚﹀垯 INSERT 浼氬洜 NOT NULL 绾︽潫澶辫触锛?
	if err := rebuildDiscussionsTableIfNeeded(); err != nil {
		return err
	}

	// 4. discussion_replies 琛?- 鏃х増鏈敤 user_id锛屾柊鐗堟湰闇€瑕?author_id
	// 鍏堣ˉ鍒?
	if err := addColumnIfNotExists("discussion_replies", "author_id", "INTEGER"); err != nil {
		return err
	}
	// 鍐嶉噸寤鸿〃锛岀Щ闄ゆ棫鐨?user_id NOT NULL 鍒楋紙鍚﹀垯 INSERT 浼氬洜 NOT NULL 绾︽潫澶辫触锛?
	if err := rebuildDiscussionRepliesTableIfNeeded(); err != nil {
		return err
	}

	// 5. reply_likes 琛?- 鐐硅禐鍔熻兘鎵€闇€锛岀‘淇濇棫闀滃儚/鏃у鍣ㄤ腑涔熻兘寤鸿〃
	if _, err := DB.Exec(`
		CREATE TABLE IF NOT EXISTS reply_likes (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			reply_id   INTEGER NOT NULL REFERENCES discussion_replies(id) ON DELETE CASCADE,
			user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(reply_id, user_id)
		)
	`); err != nil {
		return fmt.Errorf("鍒涘缓 reply_likes 琛ㄥけ璐? %v", err)
	}
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_reply_likes_reply_id ON reply_likes(reply_id)`)
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_reply_likes_user_id  ON reply_likes(user_id)`)

	// 6. discussions 琛?- 琛ュ厖绀句氦鍔熻兘鍒楋紙views/likes/favorites/heat_score锛?
	if err := addColumnIfNotExists("discussions", "views", "INTEGER NOT NULL DEFAULT 0"); err != nil { return err }
	if err := addColumnIfNotExists("discussions", "likes", "INTEGER NOT NULL DEFAULT 0"); err != nil { return err }
	if err := addColumnIfNotExists("discussions", "favorites", "INTEGER NOT NULL DEFAULT 0"); err != nil { return err }
	if err := addColumnIfNotExists("discussions", "heat_score", "REAL NOT NULL DEFAULT 0"); err != nil { return err }

	// 6b. reply_favorites 琛?
	if _, err := DB.Exec(`
		CREATE TABLE IF NOT EXISTS reply_favorites (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			reply_id   INTEGER NOT NULL REFERENCES discussion_replies(id) ON DELETE CASCADE,
			user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(reply_id, user_id)
		)
	`); err != nil {
		return fmt.Errorf("鍒涘缓 reply_favorites 琛ㄥけ璐? %v", err)
	}
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_reply_favorites_reply_id ON reply_favorites(reply_id)`)
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_reply_favorites_user_id  ON reply_favorites(user_id)`)

	// 7. exam_answers 琛?- 鏂板绛旈鑰楁椂瀛楁锛圥LAN-03锛?
	if err := addColumnIfNotExists("exam_answers", "time_spent", "INTEGER DEFAULT 0"); err != nil {
		return err
	}

	// 7. ai_corrections 琛?- AI 瑙ｆ瀽淇敼璁板綍锛圥LAN-05锛?
	if _, err := DB.Exec(`
		CREATE TABLE IF NOT EXISTS ai_corrections (
			id             INTEGER PRIMARY KEY AUTOINCREMENT,
			exam_id        INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
			user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			original_json  TEXT NOT NULL,
			corrected_json TEXT NOT NULL,
			diff_summary   TEXT NOT NULL DEFAULT '',
			created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`); err != nil {
		return fmt.Errorf("鍒涘缓 ai_corrections 琛ㄥけ璐? %v", err)
	}
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_ai_corrections_user_id ON ai_corrections(user_id)`)
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_ai_corrections_exam_id ON ai_corrections(exam_id)`)

		// 8. RAG knowledge base tables.
	if _, err := DB.Exec(`
		CREATE TABLE IF NOT EXISTS rag_documents (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
			filename    TEXT NOT NULL,
			char_count  INTEGER NOT NULL DEFAULT 0,
			chunk_count INTEGER NOT NULL DEFAULT 0,
			created_by  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`); err != nil {
		return fmt.Errorf("创建 rag_documents 表失败: %v", err)
	}
	if _, err := DB.Exec(`
		CREATE TABLE IF NOT EXISTS rag_chunks (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			doc_id      INTEGER NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
			course_id   INTEGER NOT NULL,
			chunk_index INTEGER NOT NULL,
			content     TEXT NOT NULL,
			embedding   TEXT,
			created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`); err != nil {
		return fmt.Errorf("创建 rag_chunks 表失败: %v", err)
	}
	if _, err := DB.Exec(`
		CREATE TABLE IF NOT EXISTS rag_queries (
			id            INTEGER PRIMARY KEY AUTOINCREMENT,
			course_id     INTEGER NOT NULL,
			user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			session_id    TEXT,
			question      TEXT NOT NULL,
			answer        TEXT,
			source_chunks TEXT,
			created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`); err != nil {
		return fmt.Errorf("创建 rag_queries 表失败: %v", err)
	}
	if err := addColumnIfNotExists("rag_queries", "session_id", "TEXT"); err != nil { return err }
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_rag_documents_course_id ON rag_documents(course_id)`)
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_rag_chunks_doc_id       ON rag_chunks(doc_id)`)
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_rag_chunks_course_id    ON rag_chunks(course_id)`)
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_rag_queries_course_id   ON rag_queries(course_id)`)
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_rag_queries_user_id     ON rag_queries(user_id)`)

	return nil
}

// tableColumns 杩斿洖鎸囧畾琛ㄧ殑鎵€鏈夊垪鍚嶉泦鍚?
func tableColumns(tableName string) (map[string]bool, error) {
	rows, err := DB.Query(fmt.Sprintf("PRAGMA table_info(%s)", tableName))
	if err != nil {
		return nil, fmt.Errorf("鏌ヨ %s 琛ㄧ粨鏋勫け璐? %v", tableName, err)
	}
	defer rows.Close()

	cols := make(map[string]bool)
	var cid, notnull, pk int
	var name, ctype string
	var dflt sql.NullString
	for rows.Next() {
		if err := rows.Scan(&cid, &name, &ctype, &notnull, &dflt, &pk); err != nil {
			return nil, err
		}
		cols[name] = true
	}
	return cols, nil
}

// rebuildDiscussionsTableIfNeeded 褰?discussions 琛ㄤ粛鏈夋棫 schema 鐨?author/course TEXT NOT NULL
// 鍒楁椂锛岀敤 SQLite 鎺ㄨ崘鐨?寤轰复鏃惰〃 鈫?杩佺Щ 鈫?鍒犳棫琛?鈫?鏀瑰悕"鏂瑰紡閲嶅缓锛岄伩鍏?INSERT NOT NULL 鎶ラ敊銆?
func rebuildDiscussionsTableIfNeeded() error {
	cols, err := tableColumns("discussions")
	if err != nil {
		return err
	}
	// 鍙湁鏃ц〃鎵嶆湁 author TEXT 鍒楋紱鏂?schema 鍙湁 author_id INTEGER
	if !cols["author"] {
		return nil
	}

	utils.GetLogger().Info("鈿狅笍 妫€娴嬪埌 discussions 琛ㄦ棫 schema锛堝惈 author/course TEXT NOT NULL锛夛紝寮€濮嬮噸寤?..")

	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	// 寤轰复鏃舵柊琛紙鎵€鏈?NOT NULL 鍒楅兘鏈?DEFAULT锛屼繚璇?INSERT 瀹夊叏锛?
	if _, err := tx.Exec(`
		CREATE TABLE IF NOT EXISTS discussions_new (
			id            INTEGER  PRIMARY KEY AUTOINCREMENT,
			title         TEXT     NOT NULL DEFAULT '',
			content       TEXT     NOT NULL DEFAULT '',
			course_id     INTEGER  NOT NULL DEFAULT 0,
			author_id     INTEGER  NOT NULL DEFAULT 0,
			replies       INTEGER  NOT NULL DEFAULT 0,
			last_reply_at DATETIME,
			status        TEXT     NOT NULL DEFAULT 'active',
			created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`); err != nil {
		return fmt.Errorf("鍒涘缓 discussions_new 澶辫触: %v", err)
	}

	// 杩佺Щ鏁版嵁锛歛uthor_id/course_id 宸插湪姝ラ3涓?addColumnIfNotExists 杩藉姞骞朵笖鍙兘宸叉湁鍊硷紱
	// 鑻ヤ粛涓?NULL锛岄€€鍥炲埌 0锛堟湭鐭ワ級锛屽巻鍙叉暟鎹笉涓㈠け銆?
	if _, err := tx.Exec(`
		INSERT INTO discussions_new
			(id, title, content, course_id, author_id, replies, last_reply_at, status, created_at, updated_at)
		SELECT
			id,
			COALESCE(title,        ''),
			COALESCE(content,      ''),
			COALESCE(course_id,    0),
			COALESCE(author_id,    0),
			COALESCE(replies,      0),
			last_reply_at,
			COALESCE(status,       'active'),
			COALESCE(created_at,   CURRENT_TIMESTAMP),
			COALESCE(updated_at,   CURRENT_TIMESTAMP)
		FROM discussions
	`); err != nil {
		return fmt.Errorf("杩佺Щ discussions 鏁版嵁澶辫触: %v", err)
	}

	if _, err := tx.Exec(`DROP TABLE discussions`); err != nil {
		return fmt.Errorf("鍒犻櫎鏃?discussions 琛ㄥけ璐? %v", err)
	}
	if _, err := tx.Exec(`ALTER TABLE discussions_new RENAME TO discussions`); err != nil {
		return fmt.Errorf("閲嶅懡鍚?discussions_new 澶辫触: %v", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("discussions 琛ㄩ噸寤?commit 澶辫触: %v", err)
	}

	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_discussions_status ON discussions(status)`)
	utils.GetLogger().Info("鉁?discussions 琛ㄩ噸寤哄畬鎴?)
	return nil
}

// rebuildDiscussionRepliesTableIfNeeded 褰?discussion_replies 琛ㄤ粛鏈夋棫 schema 鐨?user_id NOT NULL
// 鍒楁椂閲嶅缓锛岀Щ闄よ鍒楋紝淇濈暀 author_id锛岄伩鍏?INSERT NOT NULL 鎶ラ敊銆?
func rebuildDiscussionRepliesTableIfNeeded() error {
	cols, err := tableColumns("discussion_replies")
	if err != nil {
		return err
	}
	// 鍙湁鏃ц〃鎵嶆湁 user_id 鍒?
	if !cols["user_id"] {
		return nil
	}

	utils.GetLogger().Info("鈿狅笍 妫€娴嬪埌 discussion_replies 琛ㄦ棫 schema锛堝惈 user_id NOT NULL锛夛紝寮€濮嬮噸寤?..")

	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	// reply_likes 寮曠敤浜?discussion_replies锛汼QLite 榛樿 FK 鍏抽棴锛屽彲浠ュ厛鍒犵埗琛紝
	// 浣嗕负瀹夊叏璧疯鍏堝垹 reply_likes锛岄噸寤哄悗鍐嶉噸鏂板垱寤恒€?
	tx.Exec(`DROP TABLE IF EXISTS reply_likes`)

	if _, err := tx.Exec(`
		CREATE TABLE IF NOT EXISTS discussion_replies_new (
			id            INTEGER  PRIMARY KEY AUTOINCREMENT,
			discussion_id INTEGER  NOT NULL DEFAULT 0,
			content       TEXT     NOT NULL DEFAULT '',
			author_id     INTEGER  NOT NULL DEFAULT 0,
			created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`); err != nil {
		return fmt.Errorf("鍒涘缓 discussion_replies_new 澶辫触: %v", err)
	}

	// author_id 浼樺厛锛涜嫢宸插湪姝ラ4琛ュ垪骞惰祴鍊煎垯鐩存帴鐢紝鍚﹀垯閫€鍥?user_id
	if _, err := tx.Exec(`
		INSERT INTO discussion_replies_new
			(id, discussion_id, content, author_id, created_at, updated_at)
		SELECT
			id,
			COALESCE(discussion_id, 0),
			COALESCE(content,       ''),
			COALESCE(author_id, user_id, 0),
			COALESCE(created_at, CURRENT_TIMESTAMP),
			COALESCE(updated_at, CURRENT_TIMESTAMP)
		FROM discussion_replies
	`); err != nil {
		return fmt.Errorf("杩佺Щ discussion_replies 鏁版嵁澶辫触: %v", err)
	}

	if _, err := tx.Exec(`DROP TABLE discussion_replies`); err != nil {
		return fmt.Errorf("鍒犻櫎鏃?discussion_replies 琛ㄥけ璐? %v", err)
	}
	if _, err := tx.Exec(`ALTER TABLE discussion_replies_new RENAME TO discussion_replies`); err != nil {
		return fmt.Errorf("閲嶅懡鍚?discussion_replies_new 澶辫触: %v", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("discussion_replies 琛ㄩ噸寤?commit 澶辫触: %v", err)
	}

	utils.GetLogger().Info("鉁?discussion_replies 琛ㄩ噸寤哄畬鎴?)
	return nil
}

// addColumnIfNotExists 閫氱敤鍑芥暟锛氬鏋滃垪涓嶅瓨鍦紝鍒欐坊鍔?
func addColumnIfNotExists(tableName, columnName, columnType string) error {
	// 鏌ヨ琛ㄧ粨鏋?
	query := fmt.Sprintf("PRAGMA table_info(%s)", tableName)
	rows, err := DB.Query(query)
	if err != nil {
		return fmt.Errorf("鏃犳硶鏌ヨ琛?%s 缁撴瀯: %v", tableName, err)
	}
	defer rows.Close()

	exists := false
	var cid int
	var name, ctype string
	var notnull, pk int
	var dflt sql.NullString

	for rows.Next() {
		if err := rows.Scan(&cid, &name, &ctype, &notnull, &dflt, &pk); err != nil {
			return err
		}
		if name == columnName {
			exists = true
			break
		}
	}

	// 濡傛灉鍒椾笉瀛樺湪锛屾墽琛?ALTER TABLE
	if !exists {
		utils.GetLogger().Info("鈿狅笍 妫€娴嬪埌琛ㄧ己灏戝垪锛屾鍦ㄨ嚜鍔ㄦ坊鍔?..",
			zap.String("table", tableName),
			zap.String("column", columnName),
		)
		alterSQL := fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", tableName, columnName, columnType)
		if _, err := DB.Exec(alterSQL); err != nil {
			return fmt.Errorf("娣诲姞鍒楀け璐? %v", err)
		}
		utils.GetLogger().Info("鉁?鎴愬姛娣诲姞鍒?,
			zap.String("table", tableName),
			zap.String("column", columnName),
		)
	}

	return nil
}

// CloseDB 鍏抽棴鏁版嵁搴撹繛鎺?
func CloseDB() error {
	if DB != nil {
		return DB.Close()
	}
	return nil
}

