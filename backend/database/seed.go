package database

import (
    "encoding/json"
    "fmt"
    "os"
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

	// 学生 (10个)
	DB.Exec(`
		INSERT INTO users (username, password_hash, email, avatar_url, role)
		VALUES 
		('student', ?, 'student@example.com', 'https://i.pravatar.cc/150?u=student', 'STUDENT'),
		('张三', ?, 'zhangsan@example.com', 'https://i.pravatar.cc/150?u=zhangsan', 'STUDENT'),
		('李四', ?, 'lisi@example.com', 'https://i.pravatar.cc/150?u=lisi', 'STUDENT'),
		('王五', ?, 'wangwu@example.com', 'https://i.pravatar.cc/150?u=wangwu', 'STUDENT'),
		('赵六', ?, 'zhaoliu@example.com', 'https://i.pravatar.cc/150?u=zhaoliu', 'STUDENT'),
		('孙七', ?, 'sunqi@example.com', 'https://i.pravatar.cc/150?u=sunqi', 'STUDENT'),
		('周八', ?, 'zhouba@example.com', 'https://i.pravatar.cc/150?u=zhouba', 'STUDENT'),
		('吴九', ?, 'wujiu@example.com', 'https://i.pravatar.cc/150?u=wujiu', 'STUDENT'),
		('郑十', ?, 'zhengshi@example.com', 'https://i.pravatar.cc/150?u=zhengshi', 'STUDENT'),
		('刘一', ?, 'liuyi@example.com', 'https://i.pravatar.cc/150?u=liuyi', 'STUDENT')
	`, passwordHash, passwordHash, passwordHash, passwordHash, passwordHash, 
	   passwordHash, passwordHash, passwordHash, passwordHash, passwordHash)

	// 教师 (5个)
	DB.Exec(`
		INSERT INTO users (username, password_hash, email, avatar_url, role)
		VALUES 
		('instructor', ?, 'instructor@example.com', 'https://i.pravatar.cc/150?u=instructor', 'INSTRUCTOR'),
		('张老师', ?, 'teacher_zhang@example.com', 'https://i.pravatar.cc/150?u=teacher_zhang', 'INSTRUCTOR'),
		('李老师', ?, 'teacher_li@example.com', 'https://i.pravatar.cc/150?u=teacher_li', 'INSTRUCTOR'),
		('王老师', ?, 'teacher_wang@example.com', 'https://i.pravatar.cc/150?u=teacher_wang', 'INSTRUCTOR'),
		('赵老师', ?, 'teacher_zhao@example.com', 'https://i.pravatar.cc/150?u=teacher_zhao', 'INSTRUCTOR')
	`, passwordHash, passwordHash, passwordHash, passwordHash, passwordHash)

	// 管理员
	DB.Exec(`
		INSERT INTO users (username, password_hash, email, avatar_url, role)
		VALUES ('admin', ?, 'admin@example.com', 'https://i.pravatar.cc/150?u=admin', 'ADMIN')
	`, passwordHash)

	fmt.Println("  ✓ 用户数据创建完成 (16个用户，密码: password123)")

	// 2. 创建课程分类
	DB.Exec(`
		INSERT INTO course_categories (name, description) VALUES
		('编程开发', '编程语言和软件开发相关课程'),
		('数据科学', '数据分析、机器学习和人工智能课程'),
		('商业管理', '商业管理、金融和市场营销课程'),
		('设计创意', 'UI/UX设计、平面设计课程')
	`)

	fmt.Println("  ✓ 课程分类创建完成")

	// 3. 创建课程 (教师ID是11-15)
	DB.Exec(`
		INSERT INTO courses (title, description, cover_image_url, instructor_id, category_id, status) VALUES
		('Go语言入门', '从零开始学习Go语言编程，掌握基础语法和常用库', 'https://via.placeholder.com/300x200/4CAF50/FFFFFF?text=Go', 11, 1, 'PUBLISHED'),
		('Python高级编程', '深入学习Python高级特性，包括装饰器、生成器和元类', 'https://via.placeholder.com/300x200/2196F3/FFFFFF?text=Python', 11, 1, 'PUBLISHED'),
		('React开发实战', '使用React构建现代化的Web应用', 'https://via.placeholder.com/300x200/61DAFB/000000?text=React', 12, 1, 'PUBLISHED'),
		('TypeScript实战', 'TypeScript在项目中的实际应用', 'https://via.placeholder.com/300x200/3178C6/FFFFFF?text=TS', 12, 1, 'PUBLISHED'),
		('前端开发基础', 'HTML、CSS、JavaScript基础知识', 'https://via.placeholder.com/300x200/FF9800/FFFFFF?text=Frontend', 13, 1, 'PUBLISHED'),
		('数据分析基础', '使用Pandas进行数据分析', 'https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=Data', 13, 2, 'PUBLISHED'),
		('机器学习入门', '深度学习和神经网络基础', 'https://via.placeholder.com/300x200/9C27B0/FFFFFF?text=ML', 14, 2, 'PUBLISHED'),
		('商业数据分析', '商业场景下的数据分析方法', 'https://via.placeholder.com/300x200/FF5722/FFFFFF?text=Business', 14, 3, 'PUBLISHED'),
		('UI/UX设计', '用户界面和用户体验设计', 'https://via.placeholder.com/300x200/E91E63/FFFFFF?text=Design', 15, 4, 'PUBLISHED'),
		('JavaScript高级编程', 'JavaScript深入理解', 'https://via.placeholder.com/300x200/F7DF1E/000000?text=JS', 15, 1, 'PUBLISHED')
	`)

	fmt.Println("  ✓ 课程创建完成 (10门课程)")

	// 4. 学生选课 (学生1选了6门课)
	DB.Exec(`
		INSERT INTO course_enrollments (student_id, course_id, progress) VALUES
		(1, 1, 75),
		(1, 2, 40),
		(1, 3, 100),
		(1, 4, 30),
		(1, 5, 60),
		(1, 6, 20),
		(2, 1, 80),
		(2, 3, 35),
		(2, 5, 90),
		(3, 2, 60),
		(3, 4, 45),
		(3, 6, 70),
		(4, 1, 25),
		(4, 7, 50),
		(5, 3, 85),
		(5, 8, 40),
		(6, 5, 100),
		(6, 9, 55),
		(7, 2, 30),
		(7, 10, 65),
		(8, 4, 75),
		(8, 7, 80),
		(9, 6, 45),
		(9, 8, 70),
		(10, 9, 90),
		(10, 10, 50)
	`)

	fmt.Println("  ✓ 选课记录创建完成 (26条选课记录)")

	// 5. 创建课程章节
	DB.Exec(`
		INSERT INTO course_chapters (course_id, title, order_index) VALUES
		(1, 'Go语言基础', 1),
		(1, 'Go并发编程', 2),
		(1, 'Go Web开发', 3),
		(2, 'Python基础回顾', 1),
		(2, 'Python高级特性', 2),
		(2, 'Python实战项目', 3),
		(3, 'React基础', 1),
		(3, 'React Hooks', 2),
		(3, 'React路由', 3),
		(4, 'TypeScript基础', 1),
		(4, 'TypeScript高级类型', 2),
		(5, 'HTML和CSS', 1),
		(5, 'JavaScript基础', 2),
		(5, 'DOM操作', 3)
	`)

	fmt.Println("  ✓ 课程章节创建完成 (14个章节)")

	// 6. 创建课时 (包含视频链接)
	DB.Exec(`
		INSERT INTO course_sections (chapter_id, title, order_index, type, video_url) VALUES
		(1, 'Go语言介绍', 1, 'VIDEO', 'https://www.w3schools.com/html/mov_bbb.mp4'),
		(1, '安装Go环境', 2, 'VIDEO', 'https://www.w3schools.com/html/mov_bbb.mp4'),
		(1, '第一个Go程序', 3, 'VIDEO', 'https://www.w3schools.com/html/mov_bbb.mp4'),
		(2, 'Goroutines入门', 1, 'VIDEO', 'https://www.w3schools.com/html/mov_bbb.mp4'),
		(2, 'Channels通信', 2, 'VIDEO', 'https://www.w3schools.com/html/mov_bbb.mp4'),
		(3, 'HTTP服务器', 1, 'VIDEO', 'https://www.w3schools.com/html/mov_bbb.mp4'),
		(4, 'Python数据类型', 1, 'VIDEO', 'https://www.w3schools.com/html/mov_bbb.mp4'),
		(5, '装饰器详解', 1, 'VIDEO', 'https://www.w3schools.com/html/mov_bbb.mp4'),
		(5, '生成器和迭代器', 2, 'VIDEO', 'https://www.w3schools.com/html/mov_bbb.mp4')
	`)

    fmt.Println("  ✓ 课时创建完成 (9个课时)")

    // 7. 创建作业（含 Markdown 内容与本地附件示例）
    // 准备本地静态附件目录与示例文件
    _ = os.MkdirAll("public/assignments", 0755)
    _ = os.WriteFile("public/assignments/go-basics-spec.md", []byte("# Go语言基础练习规范\n\n- 输入/输出\n- 基本计算\n\n```go\npackage main\nimport \"fmt\"\nfunc main(){\n\tfmt.Println(\"Hello Go\")\n}\n```\n"), 0644)
    _ = os.WriteFile("public/assignments/go-basics-starter.txt", []byte("// 请在此文件中记录你的需求理解与步骤清单"), 0644)
    _ = os.WriteFile("public/assignments/go-concurrency-spec.md", []byte("# Go 并发任务池规范\n\n- 可配置并发数\n- 正确退出\n- 单元测试\n"), 0644)
    _ = os.WriteFile("public/assignments/python-data-sample.csv", []byte("id,name,score\n1,Alice,90\n2,Bob,78\n3,Carol,85\n"), 0644)
    _ = os.WriteFile("public/assignments/react-usercard-design.md", []byte("# UserCard 组件设计\n\n- 头像/姓名/简介\n- 可配置尺寸与主题\n"), 0644)

    toJSON := func(list []string) *string {
        if len(list) == 0 {
            return nil
        }
        b, _ := json.Marshal(list)
        s := string(b)
        return &s
    }

	futureDL := time.Now().Add(7 * 24 * time.Hour)  // 一周后
	pastDL := time.Now().Add(-3 * 24 * time.Hour)   // 三天前
	soonDL := time.Now().Add(2 * 24 * time.Hour)    // 两天后
	
    // 逐条插入，便于携带 Markdown 与附件 JSON
    // 1) Go语言基础练习
    content1 := "# Go语言基础练习\n\n**目标**：掌握输入/输出与基本计算。\n\n**要求**：\n- 使用 fmt 包读取用户输入\n- 完成一次加法/乘法计算\n- 输出格式化结果\n\n**示例**：\n```go\npackage main\nimport \"fmt\"\nfunc main(){\n\tfmt.Println(\"Hello Go\")\n}\n```\n"
    DB.Exec(`INSERT INTO assignments (course_id, title, content, deadline, attachments) VALUES (?, ?, ?, ?, ?)`,
        1, "Go语言基础练习", content1, pastDL, toJSON([]string{"/static/assignments/go-basics-spec.md", "/static/assignments/go-basics-starter.txt"}))

    // 2) Go并发编程作业
    content2 := "# Go 并发编程作业\n\n实现一个基于 Goroutine 与 Channel 的任务池。\n\n**验收标准**：\n1. 可配置并发数\n2. 正确关闭与资源回收\n3. 覆盖核心流程的单元测试\n"
    DB.Exec(`INSERT INTO assignments (course_id, title, content, deadline, attachments) VALUES (?, ?, ?, ?, ?)`,
        1, "Go并发编程作业", content2, futureDL, toJSON([]string{"/static/assignments/go-concurrency-spec.md"}))

    // 3) Python装饰器实战
    content3 := "# Python 装饰器实战\n\n- 统计函数耗时\n- 记录日志\n\n```python\nimport time\n```\n"
    DB.Exec(`INSERT INTO assignments (course_id, title, content, deadline, attachments) VALUES (?, ?, ?, ?, ?)`,
        2, "Python装饰器实战", content3, pastDL, nil)

    // 4) Python数据处理
    content4 := "# Python 数据处理\n\n- 清洗缺失值\n- 分组统计\n- 导出 CSV\n"
    DB.Exec(`INSERT INTO assignments (course_id, title, content, deadline, attachments) VALUES (?, ?, ?, ?, ?)`,
        2, "Python数据处理", content4, soonDL, toJSON([]string{"/static/assignments/python-data-sample.csv"}))

    // 5) React组件开发
    content5 := "# React 组件开发\n\n创建一个可复用的用户信息卡片组件：头像、姓名、简介。\n\n- Props 设计\n- 组件状态与样式\n- 单元测试\n"
    DB.Exec(`INSERT INTO assignments (course_id, title, content, deadline, attachments) VALUES (?, ?, ?, ?, ?)`,
        3, "React组件开发", content5, pastDL, toJSON([]string{"/static/assignments/react-usercard-design.md"}))

    // 6) React Hooks练习
    content6 := "# React Hooks 练习\n\n使用 useState 与 useEffect 实现计数器并处理订阅清理。\n"
    DB.Exec(`INSERT INTO assignments (course_id, title, content, deadline, attachments) VALUES (?, ?, ?, ?, ?)`,
        3, "React Hooks练习", content6, futureDL, nil)

    // 7) TypeScript类型系统
    content7 := "# TypeScript 类型系统\n\n- 接口与类型别名\n- 泛型函数\n- 条件类型\n"
    DB.Exec(`INSERT INTO assignments (course_id, title, content, deadline, attachments) VALUES (?, ?, ?, ?, ?)`,
        4, "TypeScript类型系统", content7, soonDL, nil)

    // 8) HTML+CSS布局
    content8 := "# HTML+CSS 布局\n\n- Flex 与 Grid\n- 响应式断点\n"
    DB.Exec(`INSERT INTO assignments (course_id, title, content, deadline, attachments) VALUES (?, ?, ?, ?, ?)`,
        5, "HTML+CSS布局", content8, pastDL, nil)

    // 9) JavaScript DOM操作
    content9 := "# JavaScript DOM 操作\n\n- CRUD 待办事项\n- 事件代理\n- 本地存储\n"
    DB.Exec(`INSERT INTO assignments (course_id, title, content, deadline, attachments) VALUES (?, ?, ?, ?, ?)`,
        5, "JavaScript DOM操作", content9, futureDL, nil)

    // 10) 数据可视化作业
    content10 := "# 数据可视化作业\n\n- 选择合适图表\n- 合理配色\n- 输出 PNG/PDF 报告\n"
    DB.Exec(`INSERT INTO assignments (course_id, title, content, deadline, attachments) VALUES (?, ?, ?, ?, ?)`,
        6, "数据可视化作业", content10, soonDL, nil)

    fmt.Println("  ✓ 作业创建完成 (10个作业, 含 Markdown 与示例附件)")

	// 8. 创建作业提交记录
	DB.Exec(`
		INSERT INTO assignment_submissions (assignment_id, student_id, content, grade, feedback) VALUES
		(1, 1, '我已完成Go语言基础练习，代码如下：\npackage main\nimport "fmt"\nfunc main() {\n  fmt.Println("Hello")\n}', 85.5, '完成得不错，注意代码格式和注释。建议增加错误处理。'),
		(1, 2, '这是我的Go程序实现，包含了输入输出和计算功能...', 92.0, '很好！代码清晰，逻辑正确。'),
		(1, 3, 'Go语言基础练习代码...', 78.0, '基本功能实现，但缺少部分要求。'),
		(2, 1, 'Python装饰器实现如下：\n@timer\ndef my_function():\n  pass', NULL, NULL),
		(3, 1, 'React组件代码：\nconst UserCard = () => {...}', 88.0, '组件设计合理，但可以增加PropTypes验证。'),
		(3, 2, 'React组件实现...', NULL, NULL),
		(4, 1, 'Pandas数据处理代码...', 90.0, '数据清洗步骤完整，分析有深度。'),
		(5, 1, 'React组件代码如下...', 95.0, '优秀！组件复用性强，代码规范。'),
		(5, 5, 'UserCard组件实现...', 82.0, '不错，注意边界情况的处理。'),
		(8, 1, 'HTML和CSS布局代码...', 87.0, '布局合理，响应式做得好。'),
		(8, 6, 'Flexbox布局实现...', NULL, NULL),
		(9, 1, 'TODO List实现...', NULL, NULL)
	`)

	fmt.Println("  ✓ 作业提交记录创建完成 (12条提交记录)")

	// 9. 创建考试
	examStarted := time.Now().Add(-24 * time.Hour)  // 昨天开始
	examEnding := time.Now().Add(7 * 24 * time.Hour)  // 一周后结束
	examFinished := time.Now().Add(-48 * time.Hour)  // 两天前开始
	examFinishedEnd := time.Now().Add(-24 * time.Hour) // 昨天结束
	examFuture := time.Now().Add(3 * 24 * time.Hour)  // 三天后开始
	examFutureEnd := time.Now().Add(4 * 24 * time.Hour) // 四天后结束
	
	DB.Exec(`
		INSERT INTO exams (course_id, title, start_time, end_time) VALUES
		(1, 'Go语言基础测试', ?, ?),
		(1, 'Go并发编程考试', ?, ?),
		(2, 'Python高级特性考试', ?, ?),
		(3, 'React开发期中考试', ?, ?),
		(4, 'TypeScript期末考试', ?, ?),
		(5, '前端开发综合测试', ?, ?)
	`, examStarted, examEnding, examFuture, examFutureEnd, examFinished, examFinishedEnd, 
	   examStarted, examEnding, examFuture, examFutureEnd, examFinished, examFinishedEnd)

	fmt.Println("  ✓ 考试创建完成 (6场考试)")

	// 10. 创建考试题目
	DB.Exec(`
		INSERT INTO exam_questions (exam_id, type, stem, options, answer, score, order_index) VALUES
		-- 考试1：Go语言基础测试
		(1, 'SINGLE_CHOICE', 'Go语言是由哪家公司开发的？', 
		 '["微软","谷歌","苹果","Facebook"]', '"谷歌"', 10, 1),
		(1, 'MULTIPLE_CHOICE', '以下哪些是Go语言的特点？', 
		 '["静态类型","垃圾回收","并发支持","面向对象"]', '["静态类型","垃圾回收","并发支持"]', 15, 2),
		(1, 'TRUE_FALSE', 'Go语言支持泛型编程', 
		 '["正确","错误"]', '"正确"', 5, 3),
		(1, 'SHORT_ANSWER', '请简述Goroutine的特点', 
		 NULL, '"轻量级线程，由Go运行时管理，开销小"', 20, 4),
		-- 考试3：Python高级特性考试  
		(3, 'SINGLE_CHOICE', 'Python装饰器的本质是什么？', 
		 '["函数","类","闭包","高阶函数"]', '"高阶函数"', 10, 1),
		(3, 'MULTIPLE_CHOICE', 'Python中哪些是可迭代对象？', 
		 '["列表","字典","字符串","整数"]', '["列表","字典","字符串"]', 15, 2),
		(3, 'TRUE_FALSE', 'Python的GIL会影响多线程性能', 
		 '["正确","错误"]', '"正确"', 5, 3),
		(3, 'SHORT_ANSWER', '什么是Python的生成器？', 
		 NULL, '"使用yield返回值的函数，可以暂停和恢复执行"', 20, 4),
		-- 考试4：React开发期中考试
		(4, 'SINGLE_CHOICE', 'React中useState返回的是什么？', 
		 '["变量","数组","对象","函数"]', '"数组"', 10, 1),
		(4, 'MULTIPLE_CHOICE', 'React Hooks的规则包括哪些？', 
		 '["只在顶层调用","只在React函数中调用","可以条件调用","可以在循环中调用"]', '["只在顶层调用","只在React函数中调用"]', 15, 2),
		(4, 'TRUE_FALSE', 'useEffect会在每次渲染后执行', 
		 '["正确","错误"]', '"正确"', 5, 3),
		-- 考试6：前端开发综合测试
		(6, 'SINGLE_CHOICE', 'CSS中flex-direction的默认值是？', 
		 '["row","column","row-reverse","column-reverse"]', '"row"', 10, 1),
		(6, 'MULTIPLE_CHOICE', 'JavaScript中的数据类型包括哪些？', 
		 '["Number","String","Boolean","Array","Object","Function"]', '["Number","String","Boolean","Object"]', 15, 2),
		(6, 'SHORT_ANSWER', '请解释JavaScript的事件循环机制', 
		 NULL, '"事件循环负责执行代码、收集和处理事件以及执行队列中的子任务"', 25, 3)
	`)

	fmt.Println("  ✓ 考试题目创建完成 (15道题目)")

	// 11. 创建考试提交记录
	DB.Exec(`
		INSERT INTO exam_submissions (exam_id, student_id, total_score) VALUES
		(1, 1, 42.0),
		(1, 2, 48.0),
		(1, 3, 35.0),
		(3, 1, 45.0),
		(3, 2, 50.0),
		(4, 1, 28.0),
		(4, 5, 30.0),
		(6, 1, 40.0),
		(6, 6, 48.0)
	`)

	fmt.Println("  ✓ 考试提交记录创建完成 (9条提交)")

	// 12. 创建考试答案
	DB.Exec(`
		INSERT INTO exam_answers (submission_id, question_id, student_answer, score_awarded) VALUES
		-- 学生1的考试1答案
		(1, 1, '"谷歌"', 10.0),
		(1, 2, '["静态类型","垃圾回收"]', 10.0),
		(1, 3, '"正确"', 5.0),
		(1, 4, '"Goroutine是轻量级的协程"', 17.0),
		-- 学生2的考试1答案
		(2, 1, '"谷歌"', 10.0),
		(2, 2, '["静态类型","垃圾回收","并发支持"]', 15.0),
		(2, 3, '"正确"', 5.0),
		(2, 4, '"轻量级线程，由Go运行时管理"', 18.0),
		-- 学生1的考试3答案
		(4, 5, '"高阶函数"', 10.0),
		(4, 6, '["列表","字典","字符串"]', 15.0),
		(4, 7, '"正确"', 5.0),
		(4, 8, '"使用yield的函数"', 15.0),
		-- 学生1的考试4答案
		(6, 9, '"数组"', 10.0),
		(6, 10, '["只在顶层调用","只在React函数中调用"]', 15.0),
		(6, 11, '"错误"', 0.0)
	`)

	fmt.Println("  ✓ 考试答案创建完成 (14条答案)")

	fmt.Println("✅ 测试数据填充完成！")
	fmt.Println("\n📝 测试账号:")
	fmt.Println("  学生: student / password123")
	fmt.Println("  教师: instructor / password123")
	fmt.Println("  管理员: admin / password123")

	return nil
}

