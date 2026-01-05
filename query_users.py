import sqlite3

# 连接到数据库
conn = sqlite3.connect('./backend/database/education.db')
cursor = conn.cursor()

# 查询用户数量
cursor.execute("SELECT COUNT(*) FROM users")
count = cursor.fetchone()[0]
print(f"用户总数: {count}\n")

# 查询表结构
cursor.execute("PRAGMA table_info(users)")
columns = cursor.fetchall()
print("表结构:")
for col in columns:
    print(f"  {col[1]} ({col[2]})")
print()

# 查询用户列表 - 使用实际存在的列
cursor.execute("SELECT id, username, email, role FROM users ORDER BY id")
users = cursor.fetchall()

print(f"{'ID':<5} {'用户名':<20} {'邮箱':<30} {'角色':<10}")
print("--------------------------------------------------------------------")

for user in users:
    id, username, email, role = user
    # 处理可能的None值
    email = email if email else ""
    print(f"{id:<5} {username:<20} {email:<30} {role:<10}")

# 关闭连接
conn.close()