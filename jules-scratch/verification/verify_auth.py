from playwright.sync_api import Page, expect

def test_auth_flow(page: Page):
    """
    This test verifies that a user can register and then log in.
    """
    # 1. Arrange: Go to the registration page.
    page.goto("http://localhost:3000/register")

    # 2. Act: Fill out the registration form and submit.
    page.get_by_label("用户名").fill("testuser_jules")
    page.get_by_label("密码").fill("password123")
    page.get_by_label("确认密码").fill("password123")
    page.get_by_label("用户角色").click()
    page.get_by_text("学生").click()
    page.get_by_role("button", name="注册").click()

    # 3. Assert: Check for successful registration and navigation to login page.
    expect(page).to_have_url("http://localhost:3000/login")

    # 4. Act: Fill out the login form and submit.
    page.get_by_label("用户名").fill("testuser_jules")
    page.get_by_label("密码").fill("password123")
    page.get_by_role("button", name="登录").click()

    # 5. Assert: Check for successful login and navigation to dashboard.
    expect(page).to_have_url("http://localhost:3000/student/dashboard")

    # 6. Screenshot: Capture the final result for visual verification.
    page.screenshot(path="jules-scratch/verification/verification.png")
    print("Screenshot taken successfully.")