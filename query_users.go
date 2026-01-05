package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

func main() {
	// 数据库连接
	db, err := sql.Open("sqlite3", "./backend/database/education.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// 查询用户数量
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("用户总数: %d\n\n", count)

	// 查询用户列表
	rows, err := db.Query("SELECT id, username, full_name, role FROM users ORDER BY id")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	fmt.Printf("%-5s %-20s %-30s %-10s\n", "ID", "用户名", "姓名", "角色")
	fmt.Println("--------------------------------------------------------------------")

	for rows.Next() {
		var id int
		var username, fullName, role string
		err := rows.Scan(&id, &username, &fullName, &role)
		if err != nil {
			log.Fatal(err)
		}
		fmt.Printf("%-5d %-20s %-30s %-10s\n", id, username, fullName, role)
	}

	if err = rows.Err(); err != nil {
		log.Fatal(err)
	}
}