-- Week 3 交互功能测试数据
-- 包括：直播、聊天、讨论区
-- 执行方式: docker exec -i psychic-backend sh -c "cd /app && sqlite3 database/education.db" < backend/database/week3_test_data.sql

-- 注意：确保已经执行了基础的 test_data.sql

-- ============================================================
-- 1. 直播会话 (Live Sessions)
-- ============================================================

-- 进行中的直播（课程11 - Python编程入门）
INSERT OR IGNORE INTO live_sessions (id, course_id, instructor_id, title, description, stream_name, push_url, play_url, scheduled_time, started_at, status, viewers_count) VALUES
(1, 11, 2, 'Python基础语法讲解', '详细讲解Python的基础语法，包括变量、数据类型、运算符等核心概念', 'room_11_1738876800',
 'rtmp://localhost:1935/live/room_11_1738876800',
 'http://localhost:8080/live/room_11_1738876800.m3u8',
 '2026-02-06 14:00:00', '2026-02-06 14:00:00', 'LIVE', 15);

-- 预定的直播（课程12 - Java高级编程）
INSERT OR IGNORE INTO live_sessions (id, course_id, instructor_id, title, description, stream_name, push_url, play_url, scheduled_time, status, viewers_count) VALUES
(2, 12, 2, 'Java并发编程实战', '深入讲解Java多线程和并发编程的核心知识点，包括线程池、锁机制等', 'room_12_1738963200',
 'rtmp://localhost:1935/live/room_12_1738963200',
 'http://localhost:8080/live/room_12_1738963200.m3u8',
 '2026-02-07 14:00:00', 'SCHEDULED', 0);

-- 预定的直播（课程13 - 前端开发实战）
INSERT OR IGNORE INTO live_sessions (id, course_id, instructor_id, title, description, stream_name, push_url, play_url, scheduled_time, status, viewers_count) VALUES
(3, 13, 16, 'React Hooks深度解析', 'React Hooks的使用技巧和最佳实践，包括useState、useEffect、自定义Hook等', 'room_13_1739049600',
 'rtmp://localhost:1935/live/room_13_1739049600',
 'http://localhost:8080/live/room_13_1739049600.m3u8',
 '2026-02-08 10:00:00', 'SCHEDULED', 0);

-- 已结束的直播（课程11 - Python编程入门）
INSERT OR IGNORE INTO live_sessions (id, course_id, instructor_id, title, description, stream_name, push_url, play_url, scheduled_time, started_at, ended_at, status, viewers_count) VALUES
(4, 11, 2, 'Python函数与模块', '讲解Python函数的定义、调用、参数传递，以及模块的导入和使用', 'room_11_1738790400',
 'rtmp://localhost:1935/live/room_11_1738790400',
 'http://localhost:8080/live/room_11_1738790400.m3u8',
 '2026-02-05 14:00:00', '2026-02-05 14:00:00', '2026-02-05 16:00:00', 'ENDED', 0);

-- 已结束的直播（课程13 - 前端开发实战）
INSERT OR IGNORE INTO live_sessions (id, course_id, instructor_id, title, description, stream_name, push_url, play_url, scheduled_time, started_at, ended_at, status, viewers_count) VALUES
(5, 13, 16, 'CSS Flexbox布局实战', 'Flexbox布局的完整讲解，从基础到实战案例', 'room_13_1738704000',
 'rtmp://localhost:1935/live/room_13_1738704000',
 'http://localhost:8080/live/room_13_1738704000.m3u8',
 '2026-02-04 10:00:00', '2026-02-04 10:00:00', '2026-02-04 12:00:00', 'ENDED', 0);

-- ============================================================
-- 2. 直播观看记录 (Live Viewers)
-- ============================================================

-- 当前正在观看直播1的学生
INSERT OR IGNORE INTO live_viewers (live_session_id, user_id, joined_at, left_at) VALUES
(1, 1, '2026-02-06 14:01:00', NULL),   -- student 正在观看
(1, 11, '2026-02-06 14:02:00', NULL),  -- student2 正在观看
(1, 13, '2026-02-06 14:03:00', NULL);  -- student4 正在观看

-- 已离开直播1的学生
INSERT OR IGNORE INTO live_viewers (live_session_id, user_id, joined_at, left_at) VALUES
(1, 12, '2026-02-06 14:01:30', '2026-02-06 14:25:00');  -- student3 已离开

-- 观看过直播4（已结束）的学生
INSERT OR IGNORE INTO live_viewers (live_session_id, user_id, joined_at, left_at) VALUES
(4, 1, '2026-02-05 14:00:00', '2026-02-05 16:00:00'),
(4, 11, '2026-02-05 14:05:00', '2026-02-05 15:30:00'),
(4, 13, '2026-02-05 14:02:00', '2026-02-05 16:00:00');

-- 观看过直播5（已结束）的学生
INSERT OR IGNORE INTO live_viewers (live_session_id, user_id, joined_at, left_at) VALUES
(5, 11, '2026-02-04 10:00:00', '2026-02-04 11:45:00'),
(5, 12, '2026-02-04 10:03:00', '2026-02-04 12:00:00');

-- ============================================================
-- 3. 直播聊天消息 (Live Messages)
-- ============================================================

-- 直播1的聊天消息（进行中）
INSERT OR IGNORE INTO live_messages (id, live_session_id, user_id, content, created_at) VALUES
(1, 1, 1, '老师好！准时来听课了', '2026-02-06 14:01:05'),
(2, 1, 11, '今天讲什么内容呢？', '2026-02-06 14:01:15'),
(3, 1, 2, '大家好！今天我们讲Python的基础语法', '2026-02-06 14:01:30'),
(4, 1, 13, '老师讲得很清楚！', '2026-02-06 14:05:20'),
(5, 1, 1, '请问变量命名有什么规范吗？', '2026-02-06 14:08:40'),
(6, 1, 2, '好问题！变量名要见名知意，使用小写字母和下划线', '2026-02-06 14:09:10'),
(7, 1, 11, '明白了，谢谢老师！', '2026-02-06 14:09:30'),
(8, 1, 13, '老师可以再演示一遍吗？', '2026-02-06 14:12:15'),
(9, 1, 2, '当然可以，我再演示一次', '2026-02-06 14:12:30'),
(10, 1, 1, '这个例子很好理解', '2026-02-06 14:15:00'),
(11, 1, 11, '老师能讲讲列表和元组的区别吗？', '2026-02-06 14:18:20'),
(12, 1, 2, '列表可以修改，元组不可以修改，我们马上讲到', '2026-02-06 14:18:45'),
(13, 1, 13, '666，学到了', '2026-02-06 14:20:00'),
(14, 1, 1, '老师讲得真好！', '2026-02-06 14:22:30'),
(15, 1, 11, '有课后作业吗？', '2026-02-06 14:25:00');

-- 直播4的历史聊天消息（已结束）
INSERT OR IGNORE INTO live_messages (id, live_session_id, user_id, content, created_at) VALUES
(16, 4, 1, '今天讲函数，好期待！', '2026-02-05 14:00:30'),
(17, 4, 11, '函数的参数怎么传递？', '2026-02-05 14:15:00'),
(18, 4, 2, '有位置参数、关键字参数、默认参数等', '2026-02-05 14:15:30'),
(19, 4, 13, '装饰器是什么？', '2026-02-05 14:45:00'),
(20, 4, 2, '装饰器是函数的高级用法，可以在不修改原函数的情况下增加功能', '2026-02-05 14:45:45'),
(21, 4, 1, '好强大！', '2026-02-05 14:46:00'),
(22, 4, 13, '谢谢老师，这节课收获很大', '2026-02-05 15:58:00');

-- 直播5的历史聊天消息（已结束）
INSERT OR IGNORE INTO live_messages (id, live_session_id, user_id, content, created_at) VALUES
(23, 5, 11, '开始了！', '2026-02-04 10:00:15'),
(24, 5, 16, '大家好，今天我们学习Flexbox布局', '2026-02-04 10:00:30'),
(25, 5, 12, 'Flexbox和Grid有什么区别？', '2026-02-04 10:20:00'),
(26, 5, 16, 'Flexbox主要用于一维布局，Grid用于二维布局', '2026-02-04 10:20:30'),
(27, 5, 11, '明白了！', '2026-02-04 10:21:00'),
(28, 5, 12, '老师的案例太实用了', '2026-02-04 11:30:00');

-- ============================================================
-- 4. 讨论主题 (Discussions)
-- ============================================================

-- 课程11（Python）的讨论 - OPEN状态
INSERT OR IGNORE INTO discussions (id, course_id, user_id, title, content, course, author, status, replies, last_reply, created_at) VALUES
(1, 11, 1, 'Python中如何处理文件操作？',
 '请问各位同学，Python中读取和写入文件有哪些方法？open()函数的不同模式分别是什么意思？希望能得到详细解答。',
 'Python编程入门', 'student', 'OPEN', 5, datetime('now', '-2 hours'), datetime('now', '-1 day'));

INSERT OR IGNORE INTO discussions (id, course_id, user_id, title, content, course, author, status, replies, last_reply, created_at) VALUES
(2, 11, 13, '列表推导式的使用技巧分享',
 '今天学习了列表推导式，感觉非常强大！可以用一行代码实现循环+条件判断+数据处理。大家有什么实用的技巧吗？',
 'Python编程入门', 'student4', 'OPEN', 8, datetime('now', '-1 hour'), datetime('now', '-2 days'));

INSERT OR IGNORE INTO discussions (id, course_id, user_id, title, content, course, author, status, replies, last_reply, created_at) VALUES
(3, 11, 11, '关于作业中的错误求助',
 '在完成第三次作业"面向对象编程"时，遇到了一个问题：类的继承时，子类如何正确调用父类的构造函数？我尝试了super()但报错了。',
 'Python编程入门', 'student2', 'OPEN', 3, datetime('now', '-30 minutes'), datetime('now', '-5 hours'));

-- 课程12（Java）的讨论 - OPEN状态
INSERT OR IGNORE INTO discussions (id, course_id, user_id, title, content, course, author, status, replies, last_reply, created_at) VALUES
(4, 12, 1, 'Java线程池的最佳实践讨论',
 '最近在学习Java并发编程，对于线程池的使用有些疑问。应该如何选择核心线程数和最大线程数？有哪些参数调优的经验可以分享吗？',
 'Java高级编程', 'student', 'OPEN', 12, datetime('now', '-3 hours'), datetime('now', '-1 day'));

INSERT OR IGNORE INTO discussions (id, course_id, user_id, title, content, course, author, status, replies, last_reply, created_at) VALUES
(5, 12, 12, 'JVM内存模型理解与总结',
 '今天上课讲的JVM内存模型我整理了一下笔记，包括堆、栈、方法区的区别和作用。想和大家交流一下理解是否正确。',
 'Java高级编程', 'student3', 'OPEN', 6, datetime('now', '-4 hours'), datetime('now', '-3 days'));

-- 课程13（前端）的讨论 - OPEN状态
INSERT OR IGNORE INTO discussions (id, course_id, user_id, title, content, course, author, status, replies, last_reply, created_at) VALUES
(6, 13, 11, 'React Hooks vs Class组件对比',
 '我之前学过React的Class组件写法，现在看到Hooks感觉很新颖。大家觉得Hooks和Class组件相比有什么优势？什么时候应该用Hooks？',
 '前端开发实战', 'student2', 'OPEN', 9, datetime('now', '-2 hours'), datetime('now', '-1 day'));

INSERT OR IGNORE INTO discussions (id, course_id, user_id, title, content, course, author, status, replies, last_reply, created_at) VALUES
(7, 13, 12, '前端性能优化经验分享',
 '最近在做项目时发现页面加载很慢，学习了一些性能优化的方法，包括懒加载、代码分割、CDN等。大家有什么好的优化经验吗？',
 '前端开发实战', 'student3', 'OPEN', 7, datetime('now', '-1 hour'), datetime('now', '-2 days'));

-- 已关闭的讨论
INSERT OR IGNORE INTO discussions (id, course_id, user_id, title, content, course, author, status, replies, last_reply, created_at) VALUES
(8, 11, 1, '第一次作业提交问题（已解决）',
 '请问第一次作业的提交截止时间是什么时候？提交格式有什么要求吗？',
 'Python编程入门', 'student', 'CLOSED', 4, datetime('now', '-5 days'), datetime('now', '-6 days'));

-- ============================================================
-- 5. 讨论回复 (Discussion Replies)
-- ============================================================

-- 讨论1的回复（Python文件操作）
INSERT OR IGNORE INTO discussion_replies (id, discussion_id, user_id, content, created_at) VALUES
(1, 1, 2, 'Python中使用open()函数处理文件，主要有以下几种模式：\n- "r": 只读模式\n- "w": 写入模式（会覆盖原文件）\n- "a": 追加模式\n- "r+": 读写模式\n建议使用with语句自动关闭文件。', datetime('now', '-23 hours')),
(2, 1, 13, '我一般用 with open("file.txt", "r") as f: 的方式，这样不用担心忘记关闭文件', datetime('now', '-22 hours')),
(3, 1, 11, '读取大文件时建议用readline()或者迭代器方式，避免一次性读入内存', datetime('now', '-20 hours')),
(4, 1, 1, '谢谢大家！我明白了，with语句确实很方便', datetime('now', '-18 hours')),
(5, 1, 2, '对了，还要注意文件编码问题，建议指定encoding="utf-8"参数', datetime('now', '-2 hours'));

-- 讨论2的回复（列表推导式）
INSERT OR IGNORE INTO discussion_replies (id, discussion_id, user_id, content, created_at) VALUES
(6, 2, 1, '列表推导式确实很强大！我经常用它过滤和转换数据，比如：[x*2 for x in range(10) if x % 2 == 0]', datetime('now', '-47 hours')),
(7, 2, 11, '还可以嵌套使用，处理二维列表很方便：[[i*j for j in range(5)] for i in range(5)]', datetime('now', '-46 hours')),
(8, 2, 2, '注意不要过度使用，如果逻辑太复杂，建议还是用传统的for循环，保持代码可读性', datetime('now', '-45 hours')),
(9, 2, 13, '我还学到了字典推导式和集合推导式，语法类似：{x: x**2 for x in range(5)}', datetime('now', '-44 hours')),
(10, 2, 1, '对，还有生成器表达式，用小括号，节省内存', datetime('now', '-43 hours')),
(11, 2, 11, '这些特性让Python代码变得更加简洁优雅！', datetime('now', '-42 hours')),
(12, 2, 2, '建议大家多练习，很快就能熟练掌握', datetime('now', '-2 hours')),
(13, 2, 13, '谢谢老师和同学们的分享！', datetime('now', '-1 hour'));

-- 讨论3的回复（继承问题）
INSERT OR IGNORE INTO discussion_replies (id, discussion_id, user_id, content, created_at) VALUES
(14, 3, 2, '在子类的__init__方法中，应该这样调用：super().__init__(参数)。注意super()后面有括号。能把你的代码贴出来看看吗？', datetime('now', '-4 hours')),
(15, 3, 11, '我也遇到过这个问题，要确保父类的构造函数参数传递正确', datetime('now', '-2 hours')),
(16, 3, 2, '另外，如果是多重继承，super()的调用顺序遵循MRO（方法解析顺序）', datetime('now', '-30 minutes'));

-- 讨论4的回复（Java线程池）
INSERT OR IGNORE INTO discussion_replies (id, discussion_id, user_id, content, created_at) VALUES
(17, 4, 2, '线程池参数设置建议：\n- CPU密集型：核心线程数 = CPU核数 + 1\n- IO密集型：核心线程数 = CPU核数 * 2\n最大线程数一般设置为核心线程数的2-3倍', datetime('now', '-23 hours')),
(18, 4, 12, '我在项目中使用ThreadPoolExecutor，设置了合理的队列大小和拒绝策略，效果很好', datetime('now', '-22 hours')),
(19, 4, 1, '请问拒绝策略有哪些？什么时候会触发？', datetime('now', '-21 hours')),
(20, 4, 2, '有四种拒绝策略：AbortPolicy（抛异常）、CallerRunsPolicy（调用者运行）、DiscardPolicy（丢弃）、DiscardOldestPolicy（丢弃最旧的）', datetime('now', '-20 hours')),
(21, 4, 12, '建议根据业务场景选择，一般用CallerRunsPolicy比较保险', datetime('now', '-19 hours')),
(22, 4, 1, '明白了，谢谢老师和同学！', datetime('now', '-18 hours')),
(23, 4, 16, '补充一点：记得合理设置线程的keepAliveTime，避免资源浪费', datetime('now', '-10 hours')),
(24, 4, 12, '对，空闲线程回收也很重要', datetime('now', '-8 hours')),
(25, 4, 1, '这个话题真是干货满满！', datetime('now', '-6 hours')),
(26, 4, 2, '大家可以看看《Java并发编程实战》这本书，讲得很详细', datetime('now', '-4 hours')),
(27, 4, 12, '我正在看这本书，确实很经典', datetime('now', '-3 hours')),
(28, 4, 1, '好的，我也去找来学习', datetime('now', '-3 hours'));

-- 讨论5的回复（JVM内存模型）
INSERT OR IGNORE INTO discussion_replies (id, discussion_id, user_id, content, created_at) VALUES
(29, 5, 2, '你的理解基本正确！堆用于存储对象实例，栈存储局部变量和方法调用，方法区存储类信息和常量', datetime('now', '-71 hours')),
(30, 5, 1, '我之前总是混淆堆和栈，现在终于理清楚了', datetime('now', '-70 hours')),
(31, 5, 12, '还要注意垃圾回收主要是针对堆内存的', datetime('now', '-69 hours')),
(32, 5, 2, 'Java 8之后方法区被元空间（Metaspace）替代了，使用本地内存', datetime('now', '-68 hours')),
(33, 5, 1, '老师能再讲讲年轻代和老年代的区别吗？', datetime('now', '-67 hours')),
(34, 5, 2, '年轻代存放新创建的对象，老年代存放长期存活的对象。年轻代GC频繁但快，老年代GC慢但不频繁', datetime('now', '-4 hours'));

-- 讨论6的回复（React Hooks）
INSERT OR IGNORE INTO discussion_replies (id, discussion_id, user_id, content, created_at) VALUES
(35, 6, 16, 'Hooks的优势：\n1. 代码更简洁\n2. 逻辑复用更方便\n3. 避免了this的困扰\n4. 更容易理解和测试', datetime('now', '-23 hours')),
(36, 6, 12, '我个人更喜欢Hooks，函数组件写起来比Class组件舒服多了', datetime('now', '-22 hours')),
(37, 6, 11, '那什么时候还需要用Class组件呢？', datetime('now', '-21 hours')),
(38, 6, 16, '基本上Hooks可以完全替代Class组件了，除非需要兼容老版本React', datetime('now', '-20 hours')),
(39, 6, 12, '自定义Hook真的很强大，可以把逻辑抽取出来复用', datetime('now', '-19 hours')),
(40, 6, 11, '我也在学习自定义Hook，确实很实用', datetime('now', '-18 hours')),
(41, 6, 16, '建议大家多看看React官方文档，Hooks部分讲得很详细', datetime('now', '-10 hours')),
(42, 6, 12, '我最近在用useReducer管理复杂状态，比useState灵活', datetime('now', '-8 hours')),
(43, 6, 11, '谢谢老师和同学的分享！', datetime('now', '-2 hours'));

-- 讨论7的回复（前端性能优化）
INSERT OR IGNORE INTO discussion_replies (id, discussion_id, user_id, content, created_at) VALUES
(44, 7, 16, '性能优化是个很大的话题，你提到的都是很好的方法。还可以考虑：\n1. 图片优化（压缩、WebP格式）\n2. 减少重绘和回流\n3. 使用虚拟滚动', datetime('now', '-47 hours')),
(45, 7, 11, '我最近在用React.memo优化组件，避免不必要的重渲染', datetime('now', '-46 hours')),
(46, 7, 12, '对，还有useMemo和useCallback，可以缓存计算结果和函数', datetime('now', '-45 hours')),
(47, 7, 16, 'Bundle size也要注意，可以用webpack-bundle-analyzer分析', datetime('now', '-44 hours')),
(48, 7, 11, '我用了动态import做代码分割，首屏加载速度提升明显', datetime('now', '-43 hours')),
(49, 7, 12, '浏览器缓存策略也很重要', datetime('now', '-42 hours')),
(50, 7, 16, '建议使用Lighthouse工具做性能分析，可以得到优化建议', datetime('now', '-1 hour'));

-- 讨论8的回复（已关闭）
INSERT OR IGNORE INTO discussion_replies (id, discussion_id, user_id, content, created_at) VALUES
(51, 8, 2, '作业截止时间是2月15日23:59:59，请提交.py或.txt文件', datetime('now', '-143 hours')),
(52, 8, 1, '好的谢谢老师！', datetime('now', '-142 hours')),
(53, 8, 11, '我也想问这个问题，谢谢', datetime('now', '-141 hours')),
(54, 8, 2, '不客气，有问题随时在讨论区提问', datetime('now', '-140 hours'));

-- ============================================================
-- 6. 更新sqlite_sequence表
-- ============================================================

UPDATE sqlite_sequence SET seq = 5 WHERE name = 'live_sessions';
UPDATE sqlite_sequence SET seq = 28 WHERE name = 'live_messages';
UPDATE sqlite_sequence SET seq = 8 WHERE name = 'discussions';
UPDATE sqlite_sequence SET seq = 54 WHERE name = 'discussion_replies';

-- ============================================================
-- Week 3 测试数据总结
-- ============================================================
-- 直播会话：
--   直播1：进行中（Python基础语法），15人在线
--   直播2：预定（Java并发编程）
--   直播3：预定（React Hooks）
--   直播4：已结束（Python函数）
--   直播5：已结束（CSS Flexbox）
--
-- 直播观看：
--   当前在线：student(1), student2(11), student4(13)
--   历史观看记录完整
--
-- 聊天消息：
--   直播1：15条实时消息
--   直播4：7条历史消息
--   直播5：6条历史消息
--
-- 讨论主题：
--   Python课程：3个开放讨论 + 1个已关闭
--   Java课程：2个开放讨论
--   前端课程：2个开放讨论
--
-- 讨论回复：
--   总计54条回复，涵盖技术讨论、问题解答、经验分享等
-- ============================================================

SELECT '=================================';
SELECT 'Week 3 测试数据插入完成！' as message;
SELECT '=================================';
SELECT 'Live Sessions: ' || COUNT(*) as count FROM live_sessions;
SELECT 'Live Viewers: ' || COUNT(*) as count FROM live_viewers;
SELECT 'Live Messages: ' || COUNT(*) as count FROM live_messages;
SELECT 'Discussions: ' || COUNT(*) as count FROM discussions;
SELECT 'Discussion Replies: ' || COUNT(*) as count FROM discussion_replies;
SELECT '=================================';
