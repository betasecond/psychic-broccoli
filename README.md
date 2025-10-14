# CourseArk

This is the main repository for the CourseArk project, containing both the frontend and backend applications.

## Project Structure

-   `/frontend`: Contains the React + Vite frontend application.
-   `/backend`: Contains the Spring Boot backend application.

## Environment Configuration

Create `.env` files based on the provided `.env.example` files to configure your environment variables:

- Root directory: `.env.example` - Contains general project configuration
- Backend directory: `backend/.env.example` - Contains backend-specific configuration

## Getting Started

### Backend

1.  Navigate to the backend directory and copy the example environment file:
    ```bash
    cd backend
    cp .env.example .env
    ```
2.  Update the `.env` file with your specific configuration.
3.  Run the application using Gradle:
    ```bash
    ./gradlew bootRun
    ```

### Frontend

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Copy the environment example and update as needed:
    ```bash
    cp .env.example .env
    ```
4.  Start the development server:
    ```bash
    npm run dev
    ```

## Git Management

This project uses comprehensive gitignore files to manage files properly. Large binary files like archives (`.tar`, `.tar.gz`, etc.) and Docker-related files are automatically ignored. Remember to set up your environment files properly and never commit sensitive information to the repository.
