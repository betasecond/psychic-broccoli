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

// InitDB 初始化数据库连接
func InitDB(dbPath string) error {
	var err error

	// 打开数据库连接 (使用otelsql包装)
	DB, err = otelsql.Open("sqlite3", dbPath,
		otelsql.WithAttributes(
			semconv.DBSystemSqlite,
		),
	)
	if err != nil {
		return fmt.Errorf("无法打开数据库: %v", err)
	}

	// 注册DBStats Metrics
	if _, err := otelsql.RegisterDBStatsMetrics(DB, otelsql.WithAttributes(
		semconv.DBSystemSqlite,
	)); err != nil {
		utils.GetLogger().Warn("注册数据库指标失败", zap.Error(err))
	}

	// 测试连接
	if err = DB.Ping(); err != nil {
		return fmt.Errorf("无法连接到数据库: %v", err)
	}

	// 1. 先执行基础建表（如果是第一次部署，这里会创建所有表）
	schemaSQL, err := os.ReadFile("database/schema.sql")
	if err != nil {
		return fmt.Errorf("无法读取schema.sql: %v", err)
	}
	if _, err = DB.Exec(string(schemaSQL)); err != nil {
		return fmt.Errorf("无法创建数据库表: %v", err)
	}

	// 2. 自动迁移逻辑：检查并补充现有表中缺失的列
	// 这里列出所有你后来新增的字段，每次启动都会检查
	if err := autoMigrate(); err != nil {
		return fmt.Errorf("数据库自动迁移失败: %v", err)
	}

	utils.GetLogger().Info("✅ 数据库初始化成功")
	return nil
}

// autoMigrate 集中管理所有的数据库变更
func autoMigrate() error {

	// 1. assignments 表
	if err := addColumnIfNotExists("assignments", "attachments", "TEXT"); err != nil {
		return err
	}

	// 2. users 表 - 必须加上这部分来修复 full_name 缺失问题
	if err := addColumnIfNotExists("users", "full_name", "TEXT"); err != nil { return err }
	if err := addColumnIfNotExists("users", "phone", "TEXT"); err != nil { return err }
	if err := addColumnIfNotExists("users", "gender", "TEXT"); err != nil { return err }
	if err := addColumnIfNotExists("users", "bio", "TEXT"); err != nil { return err }

	// 3. discussions 表 - 旧版本用 author/course TEXT，新版本需要 author_id/course_id/content
	// 先补列（新列为 nullable，不会破坏旧数据）
	if err := addColumnIfNotExists("discussions", "author_id", "INTEGER"); err != nil { return err }
	if err := addColumnIfNotExists("discussions", "course_id", "INTEGER"); err != nil { return err }
	if err := addColumnIfNotExists("discussions", "content", "TEXT"); err != nil { return err }
	if err := addColumnIfNotExists("discussions", "last_reply_at", "DATETIME"); err != nil { return err }
	if err := addColumnIfNotExists("discussions", "updated_at", "DATETIME DEFAULT CURRENT_TIMESTAMP"); err != nil { return err }
	// 再重建表，移除旧的 author/course TEXT NOT NULL 列（否则 INSERT 会因 NOT NULL 约束失败）
	if err := rebuildDiscussionsTableIfNeeded(); err != nil {
		return err
	}

	// 4. discussion_replies 表 - 旧版本用 user_id，新版本需要 author_id
	// 先补列
	if err := addColumnIfNotExists("discussion_replies", "author_id", "INTEGER"); err != nil {
		return err
	}
	// 再重建表，移除旧的 user_id NOT NULL 列（否则 INSERT 会因 NOT NULL 约束失败）
	if err := rebuildDiscussionRepliesTableIfNeeded(); err != nil {
		return err
	}

	// 5. reply_likes 表 - 点赞功能所需，确保旧镜像/旧容器中也能建表
	if _, err := DB.Exec(`
		CREATE TABLE IF NOT EXISTS reply_likes (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			reply_id   INTEGER NOT NULL REFERENCES discussion_replies(id) ON DELETE CASCADE,
			user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(reply_id, user_id)
		)
	`); err != nil {
		return fmt.Errorf("创建 reply_likes 表失败: %v", err)
	}
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_reply_likes_reply_id ON reply_likes(reply_id)`)
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_reply_likes_user_id  ON reply_likes(user_id)`)

	// 6. exam_answers 表 - 新增答题耗时字段（PLAN-03）
	if err := addColumnIfNotExists("exam_answers", "time_spent", "INTEGER DEFAULT 0"); err != nil {
		return err
	}

	// 7. ai_corrections 表 - AI 解析修改记录（PLAN-05）
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
		return fmt.Errorf("创建 ai_corrections 表失败: %v", err)
	}
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_ai_corrections_user_id ON ai_corrections(user_id)`)
	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_ai_corrections_exam_id ON ai_corrections(exam_id)`)

	return nil
}

// tableColumns 返回指定表的所有列名集合
func tableColumns(tableName string) (map[string]bool, error) {
	rows, err := DB.Query(fmt.Sprintf("PRAGMA table_info(%s)", tableName))
	if err != nil {
		return nil, fmt.Errorf("查询 %s 表结构失败: %v", tableName, err)
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

// rebuildDiscussionsTableIfNeeded 当 discussions 表仍有旧 schema 的 author/course TEXT NOT NULL
// 列时，用 SQLite 推荐的"建临时表 → 迁移 → 删旧表 → 改名"方式重建，避免 INSERT NOT NULL 报错。
func rebuildDiscussionsTableIfNeeded() error {
	cols, err := tableColumns("discussions")
	if err != nil {
		return err
	}
	// 只有旧表才有 author TEXT 列；新 schema 只有 author_id INTEGER
	if !cols["author"] {
		return nil
	}

	utils.GetLogger().Info("⚠️ 检测到 discussions 表旧 schema（含 author/course TEXT NOT NULL），开始重建...")

	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	// 建临时新表（所有 NOT NULL 列都有 DEFAULT，保证 INSERT 安全）
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
		return fmt.Errorf("创建 discussions_new 失败: %v", err)
	}

	// 迁移数据：author_id/course_id 已在步骤3中 addColumnIfNotExists 追加并且可能已有值；
	// 若仍为 NULL，退回到 0（未知），历史数据不丢失。
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
		return fmt.Errorf("迁移 discussions 数据失败: %v", err)
	}

	if _, err := tx.Exec(`DROP TABLE discussions`); err != nil {
		return fmt.Errorf("删除旧 discussions 表失败: %v", err)
	}
	if _, err := tx.Exec(`ALTER TABLE discussions_new RENAME TO discussions`); err != nil {
		return fmt.Errorf("重命名 discussions_new 失败: %v", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("discussions 表重建 commit 失败: %v", err)
	}

	DB.Exec(`CREATE INDEX IF NOT EXISTS idx_discussions_status ON discussions(status)`)
	utils.GetLogger().Info("✅ discussions 表重建完成")
	return nil
}

// rebuildDiscussionRepliesTableIfNeeded 当 discussion_replies 表仍有旧 schema 的 user_id NOT NULL
// 列时重建，移除该列，保留 author_id，避免 INSERT NOT NULL 报错。
func rebuildDiscussionRepliesTableIfNeeded() error {
	cols, err := tableColumns("discussion_replies")
	if err != nil {
		return err
	}
	// 只有旧表才有 user_id 列
	if !cols["user_id"] {
		return nil
	}

	utils.GetLogger().Info("⚠️ 检测到 discussion_replies 表旧 schema（含 user_id NOT NULL），开始重建...")

	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	// reply_likes 引用了 discussion_replies；SQLite 默认 FK 关闭，可以先删父表，
	// 但为安全起见先删 reply_likes，重建后再重新创建。
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
		return fmt.Errorf("创建 discussion_replies_new 失败: %v", err)
	}

	// author_id 优先；若已在步骤4补列并赋值则直接用，否则退回 user_id
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
		return fmt.Errorf("迁移 discussion_replies 数据失败: %v", err)
	}

	if _, err := tx.Exec(`DROP TABLE discussion_replies`); err != nil {
		return fmt.Errorf("删除旧 discussion_replies 表失败: %v", err)
	}
	if _, err := tx.Exec(`ALTER TABLE discussion_replies_new RENAME TO discussion_replies`); err != nil {
		return fmt.Errorf("重命名 discussion_replies_new 失败: %v", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("discussion_replies 表重建 commit 失败: %v", err)
	}

	utils.GetLogger().Info("✅ discussion_replies 表重建完成")
	return nil
}

// addColumnIfNotExists 通用函数：如果列不存在，则添加
func addColumnIfNotExists(tableName, columnName, columnType string) error {
	// 查询表结构
	query := fmt.Sprintf("PRAGMA table_info(%s)", tableName)
	rows, err := DB.Query(query)
	if err != nil {
		return fmt.Errorf("无法查询表 %s 结构: %v", tableName, err)
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

	// 如果列不存在，执行 ALTER TABLE
	if !exists {
		utils.GetLogger().Info("⚠️ 检测到表缺少列，正在自动添加...",
			zap.String("table", tableName),
			zap.String("column", columnName),
		)
		alterSQL := fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", tableName, columnName, columnType)
		if _, err := DB.Exec(alterSQL); err != nil {
			return fmt.Errorf("添加列失败: %v", err)
		}
		utils.GetLogger().Info("✅ 成功添加列",
			zap.String("table", tableName),
			zap.String("column", columnName),
		)
	}

	return nil
}

// CloseDB 关闭数据库连接
func CloseDB() error {
	if DB != nil {
		return DB.Close()
	}
	return nil
}
