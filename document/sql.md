# **在线教育平台数据库设计 (PostgreSQL)**

版本: 1.0  
设计: Gemini

## **1\. 设计约定**

* **命名规范:**  
  * 表名采用复数形式，小写蛇形命名法 (snake\_case)，例如 courses, users。  
  * 字段名采用小写蛇形命名法，例如 user\_id, created\_at。  
* **主键:**  
  * 所有表的主键统一命名为 id，类型为 BIGSERIAL (自增的长整型)。  
* **外键:**  
  * 外键命名规则为 {关联表单数名}\_id，例如 courses 表中的 instructor\_id 关联 users 表。  
* **时间戳:**  
  * 使用 TIMESTAMPTZ (带时区的时间戳) 类型，以保证时间在不同时区的准确性。  
  * created\_at: 记录创建时间，默认为当前时间。  
  * updated\_at: 记录最后更新时间，默认为当前时间，并通过触发器自动更新。  
* **枚举类型:**  
  * 使用 PostgreSQL 的 ENUM 类型来定义固定的状态或类型，增强数据完整性。  
* **索引:**  
  * 为所有外键和经常用于查询条件的字段创建索引，以提升查询性能。

## **2\. 表结构详情**

### **2.1. 用户与权限**

#### **users 表**

存储平台所有用户（学生、教师、管理员）的基础信息。

CREATE TYPE user\_role AS ENUM ('STUDENT', 'INSTRUCTOR', 'ADMIN');

CREATE TABLE users (  
    id BIGSERIAL PRIMARY KEY,  
    username VARCHAR(50) NOT NULL UNIQUE,  
    password\_hash VARCHAR(255) NOT NULL, \-- 存储 bcrypt 哈希后的密码  
    email VARCHAR(100) UNIQUE,  
    avatar\_url VARCHAR(255),  
    role user\_role NOT NULL DEFAULT 'STUDENT', \-- 为简化设计，将角色直接存于用户表  
    created\_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  
    updated\_at TIMESTAMPTZ NOT NULL DEFAULT NOW()  
);

\-- 索引  
CREATE INDEX idx\_users\_username ON users(username);  
CREATE INDEX idx\_users\_email ON users(email);

### **2.2. 课程核心**

#### **course\_categories 表**

课程分类表。

CREATE TABLE course\_categories (  
    id BIGSERIAL PRIMARY KEY,  
    name VARCHAR(100) NOT NULL UNIQUE,  
    description TEXT  
);

#### **courses 表**

核心课程信息表。

CREATE TYPE course\_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE courses (  
    id BIGSERIAL PRIMARY KEY,  
    title VARCHAR(255) NOT NULL,  
    description TEXT NOT NULL,  
    cover\_image\_url VARCHAR(255),  
    instructor\_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, \-- 讲师ID  
    category\_id BIGINT REFERENCES course\_categories(id) ON DELETE SET NULL, \-- 分类ID  
    status course\_status NOT NULL DEFAULT 'DRAFT',  
    created\_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  
    updated\_at TIMESTAMPTZ NOT NULL DEFAULT NOW()  
);

\-- 索引  
CREATE INDEX idx\_courses\_instructor\_id ON courses(instructor\_id);  
CREATE INDEX idx\_courses\_category\_id ON courses(category\_id);  
CREATE INDEX idx\_courses\_title ON courses(title);

#### **course\_enrollments 表**

学生选课记录表，记录用户和课程的多对多关系。

CREATE TABLE course\_enrollments (  
    id BIGSERIAL PRIMARY KEY,  
    student\_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,  
    course\_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,  
    enrolled\_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  
    progress INT NOT NULL DEFAULT 0, \-- 学习进度 (0-100)  
    UNIQUE(student\_id, course\_id) \-- 同一个学生不能重复选同一门课  
);

\-- 索引  
CREATE INDEX idx\_enrollments\_student\_id ON course\_enrollments(student\_id);  
CREATE INDEX idx\_enrollments\_course\_id ON course\_enrollments(course\_id);

#### **course\_chapters 与 course\_sections 表**

课程内容结构，采用“章-节”二级结构。

CREATE TABLE course\_chapters (  
    id BIGSERIAL PRIMARY KEY,  
    course\_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,  
    title VARCHAR(255) NOT NULL,  
    order\_index INT NOT NULL DEFAULT 0 \-- 章节排序  
);

CREATE TYPE section\_type AS ENUM ('VIDEO', 'LIVE', 'ASSIGNMENT', 'EXAM');

CREATE TABLE course\_sections (  
    id BIGSERIAL PRIMARY KEY,  
    chapter\_id BIGINT NOT NULL REFERENCES course\_chapters(id) ON DELETE CASCADE,  
    title VARCHAR(255) NOT NULL,  
    order\_index INT NOT NULL DEFAULT 0, \-- 课时排序  
    type section\_type NOT NULL,  
    video\_url VARCHAR(255), \-- 视频文件在OSS的key或URL  
    resource\_id BIGINT \-- 关联的作业ID或考试ID  
);

\-- 索引  
CREATE INDEX idx\_chapters\_course\_id ON course\_chapters(course\_id);  
CREATE INDEX idx\_sections\_chapter\_id ON course\_sections(chapter\_id);

### **2.3. 作业模块**

#### **assignments 表**

作业信息表。

CREATE TABLE assignments (  
    id BIGSERIAL PRIMARY KEY,  
    course\_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,  
    title VARCHAR(255) NOT NULL,  
    content TEXT,  
    deadline TIMESTAMPTZ,  
    created\_at TIMESTAMPTZ NOT NULL DEFAULT NOW()  
);

\-- 索引  
CREATE INDEX idx\_assignments\_course\_id ON assignments(course\_id);

#### **assignment\_submissions 表**

学生提交的作业记录。

CREATE TABLE assignment\_submissions (  
    id BIGSERIAL PRIMARY KEY,  
    assignment\_id BIGINT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,  
    student\_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,  
    content TEXT,  
    attachments JSONB, \-- 存储附件URL列表, e.g., '\["url1", "url2"\]'  
    submitted\_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  
    grade NUMERIC(5, 2), \-- 成绩，例如 95.50  
    feedback TEXT, \-- 教师评语  
    UNIQUE(assignment\_id, student\_id) \-- 同一个学生对同一个作业只能提交一次  
);

\-- 索引  
CREATE INDEX idx\_submissions\_assignment\_id ON assignment\_submissions(assignment\_id);  
CREATE INDEX idx\_submissions\_student\_id ON assignment\_submissions(student\_id);

### **2.4. 考试模块**

#### **exams 表**

考试信息表。

CREATE TABLE exams (  
    id BIGSERIAL PRIMARY KEY,  
    course\_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,  
    title VARCHAR(255) NOT NULL,  
    start\_time TIMESTAMPTZ NOT NULL,  
    end\_time TIMESTAMPTZ NOT NULL,  
    created\_at TIMESTAMPTZ NOT NULL DEFAULT NOW()  
);

\-- 索引  
CREATE INDEX idx\_exams\_course\_id ON exams(course\_id);

#### **exam\_questions 表**

考试题目表。

CREATE TYPE question\_type AS ENUM ('SINGLE\_CHOICE', 'MULTIPLE\_CHOICE', 'TRUE\_FALSE', 'SHORT\_ANSWER');

CREATE TABLE exam\_questions (  
    id BIGSERIAL PRIMARY KEY,  
    exam\_id BIGINT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,  
    type question\_type NOT NULL,  
    stem TEXT NOT NULL, \-- 题干  
    options JSONB, \-- 选项, e.g., '{"A": "Option 1", "B": "Option 2"}'  
    answer JSONB NOT NULL, \-- 答案, e.g., '\["B"\]' for choice, or text for short answer  
    score NUMERIC(5, 2\) NOT NULL,  
    order\_index INT NOT NULL DEFAULT 0  
);

\-- 索引  
CREATE INDEX idx\_questions\_exam\_id ON exam\_questions(exam\_id);

#### **exam\_submissions 表**

学生提交的整张考卷记录。

CREATE TABLE exam\_submissions (  
    id BIGSERIAL PRIMARY KEY,  
    exam\_id BIGINT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,  
    student\_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,  
    submitted\_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  
    total\_score NUMERIC(5, 2), \-- 最终总分  
    UNIQUE(exam\_id, student\_id)  
);

\-- 索引  
CREATE INDEX idx\_exam\_submissions\_exam\_id ON exam\_submissions(exam\_id);  
CREATE INDEX idx\_exam\_submissions\_student\_id ON exam\_submissions(student\_id);

#### **exam\_answers 表**

学生对每道题的具体答案。

CREATE TABLE exam\_answers (  
    id BIGSERIAL PRIMARY KEY,  
    submission\_id BIGINT NOT NULL REFERENCES exam\_submissions(id) ON DELETE CASCADE,  
    question\_id BIGINT NOT NULL REFERENCES exam\_questions(id) ON DELETE CASCADE,  
    student\_answer JSONB, \-- 学生答案, e.g., '\["A"\]' or '\["A", "C"\]'  
    score\_awarded NUMERIC(5, 2\) \-- 本题得分  
);

\-- 索引  
CREATE INDEX idx\_answers\_submission\_id ON exam\_answers(submission\_id);  
CREATE INDEX idx\_answers\_question\_id ON exam\_answers(question\_id);  
