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
