-- 数据库清理脚本
-- 保留核心测试账号和用户真实数据，清理批量生成的测试数据

BEGIN TRANSACTION;

-- 1. 删除批量生成的测试用户（保留 student, instructor, admin, fengran, fengranran）
DELETE FROM users WHERE id IN (2,3,4,5,6,7,8,9,10,12,13,14,15,17,18,19,20,21,22,23);

-- 2. 清理所有讨论和回复
DELETE FROM discussion_replies;
DELETE FROM discussions;

-- 3. 清理消息和通知
DELETE FROM messages;
DELETE FROM notifications;

-- 4. 清理直播相关数据
DELETE FROM live_messages;
DELETE FROM live_viewers;
DELETE FROM live_sessions;

-- 5. 清理考试相关数据
DELETE FROM exam_answers;
DELETE FROM exam_submissions;
DELETE FROM exam_questions;
DELETE FROM exams;

-- 6. 清理选课记录（保留 student(1) 和 fengran(24) 的选课）
DELETE FROM course_enrollments WHERE student_id NOT IN (1, 24);

-- 7. 清理章节完成记录（保留 student(1) 和 fengran(24) 的记录）
DELETE FROM chapter_completions WHERE student_id NOT IN (1, 24);

-- 8. 清理作业提交（保留 student(1) 和真实用户的提交）
-- 保留 submission_id 1, 2, 3, 4（这些是2月份提交的）
DELETE FROM assignment_submissions WHERE id NOT IN (1, 2, 3, 4) AND student_id != 1;

COMMIT;

-- 显示清理后的数据统计
SELECT '用户数量:' as info, COUNT(*) as count FROM users
UNION ALL
SELECT '课程数量:', COUNT(*) FROM courses
UNION ALL
SELECT '作业数量:', COUNT(*) FROM assignments
UNION ALL
SELECT '作业提交:', COUNT(*) FROM assignment_submissions
UNION ALL
SELECT '选课记录:', COUNT(*) FROM course_enrollments
UNION ALL
SELECT '讨论数量:', COUNT(*) FROM discussions
UNION ALL
SELECT '消息数量:', COUNT(*) FROM messages;
