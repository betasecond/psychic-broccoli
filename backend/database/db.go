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

	fmt.Println("✅ 数据库初始化成功")
	return nil
}

// autoMigrate 集中管理所有的数据库变更
func autoMigrate() error {
	// 示例：检查 assignments 表是否有 attachments 列
	if err := addColumnIfNotExists("assignments", "attachments", "TEXT"); err != nil {
		return err
	}
	
	// 以后如果你要在 users 表加一个 phone 字段，就加一行：
	// if err := addColumnIfNotExists("users", "phone", "TEXT"); err != nil { return err }

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
		fmt.Printf("⚠️ 检测到表 %s 缺少列 %s，正在自动添加...\n", tableName, columnName)
		alterSQL := fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", tableName, columnName, columnType)
		if _, err := DB.Exec(alterSQL); err != nil {
			return fmt.Errorf("添加列失败: %v", err)
		}
		fmt.Printf("✅ 成功添加列: %s.%s\n", tableName, columnName)
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
