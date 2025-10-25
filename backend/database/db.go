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

