-- Seed data for the online education platform

-- Users
INSERT INTO users (username, password_hash, email, avatar_url, role) VALUES
('student', '$2a$10$imcHWiRg6u.lZDfpTgGAYerXjwCioIzpOLVs1BNjAgD2JB0ZYk7iO', 'student@example.com', 'https://i.pravatar.cc/150?u=student', 'STUDENT'),
('instructor', '$2a$10$98U1f.gJOvqFiCAm44oSg.uWkprU8/opOVNpaTa3.txGZZH1hZSe.', 'instructor@example.com', 'https://i.pravatar.cc/150?u=instructor', 'INSTRUCTOR'),
('admin', '$2a$10$27.qi18rJ2NE9gSFKhNhuO1tB/XAf1iGfG8jBJ86eSatuHkvk4LNa', 'admin@example.com', 'https://i.pravatar.cc/150?u=admin', 'ADMIN');

-- Course Categories
INSERT INTO course_categories (name, description) VALUES
('Programming', 'Courses related to programming languages and software development.'),
('Data Science', 'Courses related to data analysis, machine learning, and artificial intelligence.'),
('Business', 'Courses related to business management, finance, and marketing.');

-- Courses
INSERT INTO courses (title, description, cover_image_url, instructor_id, category_id, status) VALUES
('Introduction to Go', 'A beginner-friendly course on the Go programming language.', 'https://example.com/go-course.png', 2, 1, 'PUBLISHED'),
('Advanced Python', 'An advanced course on Python programming, covering topics like decorators, generators, and metaclasses.', 'https://example.com/python-course.png', 2, 1, 'PUBLISHED'),
('Data Analysis with Pandas', 'Learn how to use the Pandas library for data analysis in Python.', 'https://example.com/pandas-course.png', 2, 2, 'DRAFT');