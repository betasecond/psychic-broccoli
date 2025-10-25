package database

import (
	"fmt"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// SeedData 填充测试数据
func SeedData() error {
	// 检查是否已有数据
	var count int
	DB.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	if count > 0 {
		fmt.Println("⚠️  数据库已有数据，跳过seed")
		return nil
	}

	fmt.Println("🌱 开始填充测试数据...")

	// 1. 创建用户
	// 密码都是 "password123"
	passwordHash, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)

	// 学生
	DB.Exec(`
		INSERT INTO users (username, password_hash, email, avatar_url, role)
		VALUES 
		('student', ?, 'student@example.com', 'https://i.pravatar.cc/150?u=student', 'STUDENT'),
		('student2', ?, 'student2@example.com', 'https://i.pravatar.cc/150?u=student2', 'STUDENT'),
		('student3', ?, 'student3@example.com', 'https://i.pravatar.cc/150?u=student3', 'STUDENT')
	`, passwordHash, passwordHash, passwordHash)

	// 教师
	DB.Exec(`
		INSERT INTO users (username, password_hash, email, avatar_url, role)
		VALUES 
		('instructor', ?, 'instructor@example.com', 'https://i.pravatar.cc/150?u=instructor', 'INSTRUCTOR'),
		('teacher', ?, 'teacher@example.com', 'https://i.pravatar.cc/150?u=teacher', 'INSTRUCTOR')
	`, passwordHash, passwordHash)

	// 管理员
	DB.Exec(`
		INSERT INTO users (username, password_hash, email, avatar_url, role)
		VALUES ('admin', ?, 'admin@example.com', 'https://i.pravatar.cc/150?u=admin', 'ADMIN')
	`, passwordHash)

	fmt.Println("  ✓ 用户数据创建完成 (密码: password123)")

	// 2. 创建课程分类
	DB.Exec(`
		INSERT INTO course_categories (name, description) VALUES
		('编程开发', '编程语言和软件开发相关课程'),
		('数据科学', '数据分析、机器学习和人工智能课程'),
		('商业管理', '商业管理、金融和市场营销课程'),
		('设计创意', 'UI/UX设计、平面设计课程')
	`)

	fmt.Println("  ✓ 课程分类创建完成")

	// 3. 创建课程 (instructor的ID是4)
	DB.Exec(`
		INSERT INTO courses (title, description, cover_image_url, instructor_id, category_id, status) VALUES
		('Go语言入门', '从零开始学习Go语言编程，掌握基础语法和常用库', 'https://via.placeholder.com/300x200/4CAF50/FFFFFF?text=Go', 4, 1, 'PUBLISHED'),
		('Python高级编程', '深入学习Python高级特性，包括装饰器、生成器和元类', 'https://via.placeholder.com/300x200/2196F3/FFFFFF?text=Python', 4, 1, 'PUBLISHED'),
		('React开发实战', '使用React构建现代化的Web应用', 'https://via.placeholder.com/300x200/61DAFB/000000?text=React', 5, 1, 'PUBLISHED'),
		('数据分析基础', '使用Pandas进行数据分析', 'https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=Data', 5, 2, 'DRAFT')
	`)

	fmt.Println("  ✓ 课程创建完成")

	// 4. 学生选课
	DB.Exec(`
		INSERT INTO course_enrollments (student_id, course_id, progress) VALUES
		(1, 1, 45),
		(1, 2, 20),
		(2, 1, 80),
		(2, 3, 35),
		(3, 2, 60)
	`)

	fmt.Println("  ✓ 选课记录创建完成")

	// 5. 创建课程章节
	DB.Exec(`
		INSERT INTO course_chapters (course_id, title, order_index) VALUES
		(1, 'Go语言基础', 1),
		(1, 'Go并发编程', 2),
		(1, 'Go Web开发', 3),
		(2, 'Python基础回顾', 1),
		(2, 'Python高级特性', 2)
	`)

	fmt.Println("  ✓ 课程章节创建完成")

	// 6. 创建课时 (包含视频链接)
	DB.Exec(`
		INSERT INTO course_sections (chapter_id, title, order_index, type, video_url) VALUES
		(1, 'Go语言介绍', 1, 'VIDEO', 'https://www.w3schools.com/html/mov_bbb.mp4'),
		(1, '安装Go环境', 2, 'VIDEO', 'https://www.w3schools.com/html/mov_bbb.mp4'),
		(1, '第一个Go程序', 3, 'VIDEO', 'https://www.w3schools.com/html/mov_bbb.mp4'),
		(2, 'Goroutines入门', 1, 'VIDEO', 'https://www.w3schools.com/html/mov_bbb.mp4'),
		(2, 'Channels通信', 2, 'VIDEO', 'https://www.w3schools.com/html/mov_bbb.mp4')
	`)

	fmt.Println("  ✓ 课时创建完成")

	// 7. 创建作业
	deadline := time.Now().Add(7 * 24 * time.Hour) // 一周后
	DB.Exec(`
		INSERT INTO assignments (course_id, title, content, deadline) VALUES
		(1, 'Go语言基础练习', '编写一个简单的Go程序，实现基本的输入输出', ?),
		(2, 'Python装饰器实战', '使用装饰器实现函数执行时间统计', ?),
		(3, 'React组件开发', '创建一个可复用的React组件', ?)
	`, deadline, deadline, deadline)

	fmt.Println("  ✓ 作业创建完成")

	// 8. 创建作业提交
	DB.Exec(`
		INSERT INTO assignment_submissions (assignment_id, student_id, content, grade, feedback) VALUES
		(1, 1, '我已完成Go语言基础练习，代码如下...', 85.5, '完成得不错，注意代码格式'),
		(2, 1, 'Python装饰器实现如下...', NULL, NULL),
		(1, 2, '这是我的Go程序实现...', 92.0, '很好！')
	`)

	fmt.Println("  ✓ 作业提交记录创建完成")

	// 9. 创建考试
	startTime := time.Now().Add(-24 * time.Hour)   // 昨天
	endTime := time.Now().Add(7 * 24 * time.Hour)  // 一周后
	DB.Exec(`
		INSERT INTO exams (course_id, title, start_time, end_time) VALUES
		(1, 'Go语言基础测试', ?, ?),
		(2, 'Python高级特性考试', ?, ?)
	`, startTime, endTime, startTime, endTime)

	fmt.Println("  ✓ 考试创建完成")

	// 10. 创建考试题目
	DB.Exec(`
		INSERT INTO exam_questions (exam_id, type, stem, options, answer, score, order_index) VALUES
		(1, 'SINGLE_CHOICE', 'Go语言是由哪家公司开发的？', 
		 '{"A":"微软","B":"谷歌","C":"苹果","D":"Facebook"}', '"B"', 10, 1),
		(1, 'MULTIPLE_CHOICE', '以下哪些是Go语言的特点？', 
		 '{"A":"静态类型","B":"垃圾回收","C":"并发支持","D":"面向对象"}', '["A","B","C"]', 15, 2),
		(1, 'TRUE_FALSE', 'Go语言支持泛型编程', 
		 '{"A":"正确","B":"错误"}', '"A"', 5, 3),
		(1, 'SHORT_ANSWER', '请简述Goroutine的特点', 
		 NULL, '"轻量级线程，由Go运行时管理"', 20, 4)
	`)

	fmt.Println("  ✓ 考试题目创建完成")

	// 11. 创建考试提交记录
	DB.Exec(`
		INSERT INTO exam_submissions (exam_id, student_id, total_score) VALUES
		(1, 1, 25.0),
		(1, 2, 40.0)
	`)

	// 12. 创建考试答案
	DB.Exec(`
		INSERT INTO exam_answers (submission_id, question_id, student_answer, score_awarded) VALUES
		(1, 1, '"B"', 10.0),
		(1, 2, '["A","B"]', 0.0),
		(1, 3, '"A"', 5.0),
		(1, 4, '"Goroutine是轻量级的"', 10.0)
	`)

	fmt.Println("  ✓ 考试答案创建完成")

	fmt.Println("✅ 测试数据填充完成！")
	fmt.Println("\n📝 测试账号:")
	fmt.Println("  学生: student / password123")
	fmt.Println("  教师: instructor / password123")
	fmt.Println("  管理员: admin / password123")

	return nil
}

