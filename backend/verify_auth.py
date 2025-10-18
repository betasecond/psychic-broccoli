import requests
import json

BASE_URL = "http://localhost:35001/api/v1"

def register(username, password):
    url = f"{BASE_URL}/auth/register"
    headers = {"Content-Type": "application/json"}
    data = {"username": username, "password": password, "email": f"{username}@example.com"}
    response = requests.post(url, headers=headers, data=json.dumps(data))
    return response

def login(username, password):
    url = f"{BASE_URL}/auth/login"
    headers = {"Content-Type": "application/json"}
    data = {"username": username, "password": password}
    response = requests.post(url, headers=headers, data=json.dumps(data))
    return response

def get_current_user(token):
    url = f"{BASE_URL}/auth/me"
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(url, headers=headers)
    return response

def get_courses(token):
    url = f"{BASE_URL}/courses"
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(url, headers=headers)
    return response

def main():
    # Register a new user
    print("Registering a new user...")
    register_response = register("testuser", "password123")
    print(f"Status Code: {register_response.status_code}")
    print(f"Response: {register_response.json()}")
    assert register_response.status_code == 200

    # Login with the new user
    print("\nLogging in with the new user...")
    login_response = login("testuser", "password123")
    print(f"Status Code: {login_response.status_code}")
    login_data = login_response.json()
    print(f"Response: {login_data}")
    assert login_response.status_code == 200
    token = login_data["token"]

    # Get the current user's information
    print("\nGetting the current user's information...")
    user_response = get_current_user(token)
    print(f"Status Code: {user_response.status_code}")
    print(f"Response: {user_response.json()}")
    assert user_response.status_code == 200

    # Get the courses
    print("\nGetting the courses...")
    courses_response = get_courses(token)
    print(f"Status Code: {courses_response.status_code}")
    print(f"Response: {courses_response.json()}")
    assert courses_response.status_code == 200

    print("\nAuthentication and course verification successful!")

if __name__ == "__main__":
    main()