-- 测试数据脚本 - 用于权限测试
-- 执行方式: sqlite3 database/education.db < database/test_data.sql

-- 注意：所有用户密码都是 password123
-- Password hash: $2a$10$1atyBjl4fJN.oMcHPFU0yuHwHC3CkIyLUXQU8M2Yf3il3SN9LXDmK

-- ============================================================
-- 1. 清理现有测试数据（可选，谨慎使用）
-- ============================================================
-- DELETE FROM assignment_submissions;
-- DELETE FROM assignments;
-- DELETE FROM course_enrollments;
-- DELETE FROM course_chapters;
-- DELETE FROM courses WHERE id > 10;
-- DELETE FROM users WHERE id > 10;

-- ============================================================
-- 2. 添加更多测试用户
-- ============================================================

-- 添加学生用户 (ID 11-15)
INSERT OR IGNORE INTO users (id, username, password_hash, email, role, avatar_url) VALUES
(11, 'student2', '$2a$10$1atyBjl4fJN.oMcHPFU0yuHwHC3CkIyLUXQU8M2Yf3il3SN9LXDmK', 'student2@example.com', 'STUDENT', 'https://i.pravatar.cc/150?u=student2'),
(12, 'student3', '$2a$10$1atyBjl4fJN.oMcHPFU0yuHwHC3CkIyLUXQU8M2Yf3il3SN9LXDmK', 'student3@example.com', 'STUDENT', 'https://i.pravatar.cc/150?u=student3'),
(13, 'student4', '$2a$10$1atyBjl4fJN.oMcHPFU0yuHwHC3CkIyLUXQU8M2Yf3il3SN9LXDmK', 'student4@example.com', 'STUDENT', 'https://i.pravatar.cc/150?u=student4'),
(14, 'student5', '$2a$10$1atyBjl4fJN.oMcHPFU0yuHwHC3CkIyLUXQU8M2Yf3il3SN9LXDmK', 'student5@example.com', 'STUDENT', 'https://i.pravatar.cc/150?u=student5'),
(15, 'student6', '$2a$10$1atyBjl4fJN.oMcHPFU0yuHwHC3CkIyLUXQU8M2Yf3il3SN9LXDmK', 'student6@example.com', 'STUDENT', 'https://i.pravatar.cc/150?u=student6');

-- 添加教师用户 (ID 16-18)
INSERT OR IGNORE INTO users (id, username, password_hash, email, role, avatar_url) VALUES
(16, 'instructor2', '$2a$10$1atyBjl4fJN.oMcHPFU0yuHwHC3CkIyLUXQU8M2Yf3il3SN9LXDmK', 'instructor2@example.com', 'INSTRUCTOR', 'https://i.pravatar.cc/150?u=instructor2'),
(17, 'instructor3', '$2a$10$1atyBjl4fJN.oMcHPFU0yuHwHC3CkIyLUXQU8M2Yf3il3SN9LXDmK', 'instructor3@example.com', 'INSTRUCTOR', 'https://i.pravatar.cc/150?u=instructor3'),
(18, 'instructor4', '$2a$10$1atyBjl4fJN.oMcHPFU0yuHwHC3CkIyLUXQU8M2Yf3il3SN9LXDmK', 'instructor4@example.com', 'INSTRUCTOR', 'https://i.pravatar.cc/150?u=instructor4');

-- ============================================================
-- 3. 添加不同状态的课程
-- ============================================================

-- 已发布课程 (PUBLISHED) - 所有学生可见
INSERT OR IGNORE INTO courses (id, title, description, instructor_id, status, category_id) VALUES
(11, 'Python编程入门', '从零开始学习Python编程语言，掌握基础语法和核心概念', 2, 'PUBLISHED', 1),
(12, 'Java高级编程', '深入学习Java高级特性，包括多线程、并发、JVM等', 2, 'PUBLISHED', 1),
(13, '前端开发实战', '学习HTML、CSS、JavaScript，构建现代化Web应用', 16, 'PUBLISHED', 1);

-- 草稿课程 (DRAFT) - 只有创建者和管理员可见
INSERT OR IGNORE INTO courses (id, title, description, instructor_id, status, category_id) VALUES
(14, '机器学习基础（草稿）', '这是一个还在准备中的机器学习课程', 2, 'DRAFT', 1),
(15, '数据结构与算法（草稿）', '系统学习数据结构和算法设计', 16, 'DRAFT', 1),
(16, 'Go语言开发（草稿）', '学习Go语言及其生态系统', 17, 'DRAFT', 1);

-- 已归档课程 (ARCHIVED)
INSERT OR IGNORE INTO courses (id, title, description, instructor_id, status, category_id) VALUES
(17, '旧版Web开发（已归档）', '这是一个已经结束的课程', 16, 'ARCHIVED', 1);

-- ============================================================
-- 4. 建立选课关系
-- ============================================================

-- student (ID=1) 选了课程 11, 12
INSERT OR IGNORE INTO course_enrollments (student_id, course_id, progress) VALUES
(1, 11, 30),
(1, 12, 50);

-- student2 (ID=11) 选了课程 11, 13
INSERT OR IGNORE INTO course_enrollments (student_id, course_id, progress) VALUES
(11, 11, 10),
(11, 13, 60);

-- student3 (ID=12) 选了课程 12, 13
INSERT OR IGNORE INTO course_enrollments (student_id, course_id, progress) VALUES
(12, 12, 20),
(12, 13, 40);

-- student4 (ID=13) 选了课程 11
INSERT OR IGNORE INTO course_enrollments (student_id, course_id, progress) VALUES
(13, 11, 80);

-- student5 (ID=14) 没有选任何课程（用于测试未选课权限）

-- ============================================================
-- 5. 创建作业
-- ============================================================

-- 课程 11 (Python编程入门) 的作业
INSERT OR IGNORE INTO assignments (id, course_id, title, content, deadline) VALUES
(11, 11, 'Python基础练习1', '完成Python基础语法练习，包括变量、数据类型、控制流等', '2026-02-15 23:59:59'),
(12, 11, 'Python函数编程', '编写至少5个函数，实现不同的功能', '2026-02-20 23:59:59'),
(13, 11, 'Python面向对象', '使用类和对象实现一个学生管理系统', '2026-02-25 23:59:59');

-- 课程 12 (Java高级编程) 的作业
INSERT OR IGNORE INTO assignments (id, course_id, title, content, deadline) VALUES
(14, 12, 'Java多线程编程', '实现一个多线程的生产者-消费者模型', '2026-02-18 23:59:59'),
(15, 12, 'Java集合框架', '深入理解并使用Java集合框架', '2026-02-22 23:59:59');

-- 课程 13 (前端开发实战) 的作业
INSERT OR IGNORE INTO assignments (id, course_id, title, content, deadline) VALUES
(16, 13, 'HTML5网页制作', '制作一个个人简历网页', '2026-02-16 23:59:59'),
(17, 13, 'CSS布局练习', '使用Flexbox和Grid实现响应式布局', '2026-02-19 23:59:59');

-- ============================================================
-- 6. 创建作业提交记录
-- ============================================================

-- student (ID=1) 提交课程11的作业
INSERT OR IGNORE INTO assignment_submissions (id, assignment_id, student_id, content, grade, feedback, submitted_at) VALUES
(11, 11, 1, '我完成了所有的Python基础练习题...', 85.0, '完成得很好！代码规范', '2026-02-10 14:30:00'),
(12, 12, 1, '这是我编写的5个函数...', 90.0, '优秀！函数设计合理', '2026-02-12 16:20:00'),
(13, 13, 1, '学生管理系统代码如下...', NULL, NULL, '2026-02-14 10:15:00'); -- 还未批改

-- student (ID=1) 提交课程12的作业
INSERT OR IGNORE INTO assignment_submissions (id, assignment_id, student_id, content, grade, feedback, submitted_at) VALUES
(14, 14, 1, '生产者-消费者模型实现...', 88.0, '线程同步处理正确', '2026-02-15 09:00:00');

-- student2 (ID=11) 提交课程11的作业
INSERT OR IGNORE INTO assignment_submissions (id, assignment_id, student_id, content, grade, feedback, submitted_at) VALUES
(15, 11, 11, 'Python基础练习完成情况...', 75.0, '基础掌握较好，需加强', '2026-02-11 11:00:00'),
(16, 12, 11, '这是我的函数作业...', NULL, NULL, '2026-02-13 15:30:00'); -- 还未批改

-- student3 (ID=12) 提交课程12的作业
INSERT OR IGNORE INTO assignment_submissions (id, assignment_id, student_id, content, grade, feedback, submitted_at) VALUES
(17, 14, 12, 'Java多线程实现...', 92.0, '代码质量高，理解深刻', '2026-02-16 20:00:00');

-- student3 (ID=12) 提交课程13的作业
INSERT OR IGNORE INTO assignment_submissions (id, assignment_id, student_id, content, grade, feedback, submitted_at) VALUES
(18, 16, 12, 'HTML5简历网页代码...', 80.0, '结构清晰，样式有待提升', '2026-02-14 18:45:00'),
(19, 17, 12, 'CSS布局练习提交...', NULL, NULL, '2026-02-17 22:30:00'); -- 还未批改

-- student4 (ID=13) 提交课程11的作业
INSERT OR IGNORE INTO assignment_submissions (id, assignment_id, student_id, content, grade, feedback, submitted_at) VALUES
(20, 11, 13, 'Python基础作业...', 95.0, '非常优秀！', '2026-02-09 08:00:00'),
(21, 12, 13, '函数编程作业...', 94.0, '代码优雅，逻辑清晰', '2026-02-11 19:00:00'),
(22, 13, 13, '面向对象作业...', 98.0, '完美完成！设计模式使用得当', '2026-02-13 21:00:00');

-- ============================================================
-- 7. 添加课程章节
-- ============================================================

-- 课程 11 (Python编程入门) 的章节
INSERT OR IGNORE INTO course_chapters (id, course_id, title, order_index) VALUES
(11, 11, '第1章：Python环境搭建', 1),
(12, 11, '第2章：变量与数据类型', 2),
(13, 11, '第3章：控制流程', 3),
(14, 11, '第4章：函数定义与使用', 4),
(15, 11, '第5章：面向对象编程', 5);

-- 课程 12 (Java高级编程) 的章节
INSERT OR IGNORE INTO course_chapters (id, course_id, title, order_index) VALUES
(16, 12, '第1章：Java并发编程基础', 1),
(17, 12, '第2章：线程安全与同步', 2),
(18, 12, '第3章：JVM内存模型', 3),
(19, 12, '第4章：性能优化', 4);

-- 课程 13 (前端开发实战) 的章节
INSERT OR IGNORE INTO course_chapters (id, course_id, title, order_index) VALUES
(20, 13, '第1章：HTML5新特性', 1),
(21, 13, '第2章：CSS3高级技巧', 2),
(22, 13, '第3章：JavaScript ES6+', 3),
(23, 13, '第4章：React框架入门', 4);

-- ============================================================
-- 8. 更新sqlite_sequence表（如果使用AUTOINCREMENT）
-- ============================================================

UPDATE sqlite_sequence SET seq = 18 WHERE name = 'users';
UPDATE sqlite_sequence SET seq = 17 WHERE name = 'courses';
UPDATE sqlite_sequence SET seq = 17 WHERE name = 'assignments';
UPDATE sqlite_sequence SET seq = 22 WHERE name = 'assignment_submissions';
UPDATE sqlite_sequence SET seq = 23 WHERE name = 'course_chapters';

-- ============================================================
-- 测试数据总结
-- ============================================================
-- 用户：
--   学生：student (1), student2 (11), student3 (12), student4 (13), student5 (14), student6 (15)
--   教师：instructor (2), instructor2 (16), instructor3 (17), instructor4 (18)
--   管理员：admin (3)
--
-- 课程：
--   已发布：课程11 (Python), 课程12 (Java), 课程13 (前端) - 所有学生可见
--   草稿：课程14, 15, 16 - 只有创建者和管理员可见
--   已归档：课程17
--
-- 选课关系：
--   student(1): 已选课程11, 12
--   student2(11): 已选课程11, 13
--   student3(12): 已选课程12, 13
--   student4(13): 已选课程11
--   student5(14): 未选任何课程（用于测试权限）
--
-- 作业提交：
--   每个已选课的学生都有相应的作业提交记录
--   部分作业已批改，部分未批改
-- ============================================================

SELECT '测试数据插入完成！' as message;
SELECT 'Total users: ' || COUNT(*) FROM users;
SELECT 'Total courses: ' || COUNT(*) FROM courses;
SELECT 'Total enrollments: ' || COUNT(*) FROM course_enrollments;
SELECT 'Total assignments: ' || COUNT(*) FROM assignments;
SELECT 'Total submissions: ' || COUNT(*) FROM assignment_submissions;
