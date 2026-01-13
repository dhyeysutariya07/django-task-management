# Task Management System

A full-stack task management application built with Django REST Framework and React, featuring role-based access control, real-time notifications, and comprehensive analytics.

## Prerequisites

- Python 3.14+
- [uv](https://github.com/astral-sh/uv) package manager
- Node.js 18+ and npm
- PostgreSQL 12+
- Docker (for Mailpit email testing)

## Setup

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TaskManagement
   ```

2. **Install dependencies with uv**
   ```bash
   uv sync
   ```

3. **Configure environment variables**
   - Copy `.env.example` to `.env`
   - Update the values in `.env` with your credentials:
     ```bash
     cp .env.example .env
     ```

4. **Start Mailpit for email testing**
   ```bash
   docker run -d --name mailpit -p 8025:8025 -p 1025:1025 axllent/mailpit
   ```
   
   Mailpit web interface will be available at `http://localhost:8025`

5. **Configure PostgreSQL**
   - Create a PostgreSQL database named `taskmanagement`
   - Update database credentials in `.env` file (already done in step 3)

6. **Run migrations**
   ```bash
   uv run python manage.py migrate
   ```

7. **Create a superuser**
   ```bash
   uv run python manage.py createsuperuser
   ```

8. **Start the development server**
   ```bash
   uv run python manage.py runserver
   ```

   The API will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend/task-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   - Copy `.env.example` to `.env`
   - Update the API endpoint if needed

4. **Start the development server**
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:5173`

## API Documentation

Once the backend server is running, access the interactive API documentation:

- **Swagger UI**: `http://localhost:8000/api/docs`
- **ReDoc**: `http://localhost:8000/api/redoc/`

## User Roles

- **Manager**: Full access to all tasks, can create/update/delete any task
- **Developer**: Can create and update own tasks, cannot delete
- **Auditor**: Read-only access to all tasks and audit logs
