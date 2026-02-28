-- 创建章节完成记录表
CREATE TABLE IF NOT EXISTS chapter_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chapter_id INTEGER NOT NULL REFERENCES course_chapters(id) ON DELETE CASCADE,
    completed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, chapter_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_chapter_completions_student_id ON chapter_completions(student_id);
CREATE INDEX IF NOT EXISTS idx_chapter_completions_chapter_id ON chapter_completions(chapter_id);
