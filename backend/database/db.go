package database

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

// InitDB 初始化数据库连接
func InitDB(dbPath string) error {
	var err error
	
	// 打开数据库连接
	DB, err = sql.Open("sqlite3", dbPath)
	if err != nil {
		return fmt.Errorf("无法打开数据库: %v", err)
	}

	// 测试连接
	if err = DB.Ping(); err != nil {
		return fmt.Errorf("无法连接到数据库: %v", err)
	}

	// 读取并执行schema.sql
	schemaSQL, err := os.ReadFile("database/schema.sql")
	if err != nil {
		return fmt.Errorf("无法读取schema.sql: %v", err)
	}

	// 执行建表语句
	if _, err = DB.Exec(string(schemaSQL)); err != nil {
		return fmt.Errorf("无法创建数据库表: %v", err)
	}

    // 保障新增列存在（幂等）
    if err := ensureAssignmentAttachmentsColumn(); err != nil {
        return fmt.Errorf("数据库列校验失败: %v", err)
    }

	fmt.Println("✅ 数据库初始化成功")
	return nil
}

// CloseDB 关闭数据库连接
func CloseDB() error {
	if DB != nil {
		return DB.Close()
	}
	return nil
}

// ensureAssignmentAttachmentsColumn 确保 assignments 表存在 attachments 列（SQLite 不支持 IF NOT EXISTS 列级别，这里做运行时校验）
func ensureAssignmentAttachmentsColumn() error {
    rows, err := DB.Query("PRAGMA table_info(assignments)")
    if err != nil {
        return err
    }
    defer rows.Close()

    has := false
    for rows.Next() {
        var cid int
        var name, ctype string
        var notnull, pk int
        var dflt sql.NullString
        if err := rows.Scan(&cid, &name, &ctype, &notnull, &dflt, &pk); err != nil {
            return err
        }
        if name == "attachments" {
            has = true
            break
        }
    }
    if !has {
        if _, err := DB.Exec("ALTER TABLE assignments ADD COLUMN attachments TEXT"); err != nil {
            return err
        }
    }
    return nil
}

