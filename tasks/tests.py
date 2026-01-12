from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from tasks.models import Task, TaskHistory, Tag
from notifications.models import Notification

User = get_user_model()


class TaskModelTest(TestCase):
    """Test Task model"""

    def setUp(self):
        self.manager = User.objects.create_user(
            username="manager",
            email="manager@test.com",
            password="pass123",
            role="manager",
            is_email_verified=True
        )
        self.developer = User.objects.create_user(
            username="developer",
            email="dev@test.com",
            password="pass123",
            role="developer",
            is_email_verified=True
        )

    def test_create_task(self):
        """Test creating a basic task"""
        task = Task.objects.create(
            title="Test Task",
            description="Test Description",
            status=Task.Status.PENDING,
            priority=Task.Priority.MEDIUM,
            assigned_to=self.developer,
            created_by=self.manager,
            estimated_hours=5.0
        )
        self.assertEqual(task.title, "Test Task")
        self.assertEqual(task.status, Task.Status.PENDING)
        self.assertFalse(task.priority_escalated)

    def test_parent_child_relationship(self):
        """Test parent-child task relationship"""
        parent = Task.objects.create(
            title="Parent Task",
            assigned_to=self.developer,
            created_by=self.manager
        )
        child = Task.objects.create(
            title="Child Task",
            assigned_to=self.developer,
            created_by=self.manager,
            parent_task=parent
        )
        
        self.assertEqual(child.parent_task, parent)
        self.assertIn(child, parent.children.all())

    def test_task_with_tags(self):
        """Test task with multiple tags"""
        task = Task.objects.create(
            title="Tagged Task",
            assigned_to=self.developer,
            created_by=self.manager
        )
        
        tag1 = Tag.objects.create(name="backend")
        tag2 = Tag.objects.create(name="urgent")
        
        task.tags.add(tag1, tag2)
        
        self.assertEqual(task.tags.count(), 2)
        self.assertIn(tag1, task.tags.all())


class TaskAPITest(APITestCase):
    """Test Task API endpoints"""

    def setUp(self):
        self.manager = User.objects.create_user(
            username="manager",
            email="manager@test.com",
            password="pass123",
            role="manager",
            is_email_verified=True
        )
        self.developer = User.objects.create_user(
            username="developer",
            email="dev@test.com",
            password="pass123",
            role="developer",
            is_email_verified=True
        )
        self.auditor = User.objects.create_user(
            username="auditor",
            email="auditor@test.com",
            password="pass123",
            role="auditor",
            is_email_verified=True
        )
        
        # Login as manager
        response = self.client.post("/api/auth/login/", {
            "username": "manager",
            "password": "pass123"
        })
        self.manager_token = response.data["access"]

    def test_manager_create_task(self):
        """Test manager can create task for any user"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.manager_token}")
        
        data = {
            "title": "New Task",
            "description": "Task description",
            "status": "pending",
            "priority": "high",
            "assigned_to": self.developer.id,
            "estimated_hours": 8.0,
            "tags": ["backend", "api"]
        }
        
        response = self.client.post("/api/tasks/", data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify task created
        task = Task.objects.get(title="New Task")
        self.assertEqual(task.assigned_to, self.developer)
        self.assertEqual(task.created_by, self.manager)
        self.assertEqual(task.tags.count(), 2)

    def test_developer_create_task_self_only(self):
        """Test developer can only create tasks for themselves"""
        # Login as developer
        response = self.client.post("/api/auth/login/", {
            "username": "developer",
            "password": "pass123"
        })
        dev_token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {dev_token}")
        
        data = {
            "title": "Dev Task",
            "description": "Self-assigned",
            "status": "pending",
            "priority": "medium",
            "assigned_to": self.manager.id,  # Try to assign to manager
            "estimated_hours": 5.0
        }
        
        response = self.client.post("/api/tasks/", data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Should be assigned to developer, not manager
        task = Task.objects.get(title="Dev Task")
        self.assertEqual(task.assigned_to, self.developer)

    def test_auditor_cannot_create_task(self):
        """Test auditor cannot create tasks"""
        # Login as auditor
        response = self.client.post("/api/auth/login/", {
            "username": "auditor",
            "password": "pass123"
        })
        auditor_token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {auditor_token}")
        
        data = {
            "title": "Auditor Task",
            "status": "pending",
            "priority": "low",
            "assigned_to": self.developer.id
        }
        
        response = self.client.post("/api/tasks/", data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_tasks(self):
        """Test listing all tasks"""
        Task.objects.create(
            title="Task 1",
            assigned_to=self.developer,
            created_by=self.manager
        )
        Task.objects.create(
            title="Task 2",
            assigned_to=self.developer,
            created_by=self.manager
        )
        
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.manager_token}")
        response = self.client.get("/api/tasks/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_update_task(self):
        """Test updating a task"""
        task = Task.objects.create(
            title="Original Title",
            status=Task.Status.PENDING,
            assigned_to=self.developer,
            created_by=self.manager
        )
        
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.manager_token}")
        
        data = {
            "title": "Updated Title",
            "status": "in_progress",
            "priority": "high",
            "assigned_to": self.developer.id
        }
        
        response = self.client.patch(f"/api/tasks/{task.id}/", data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        task.refresh_from_db()
        self.assertEqual(task.title, "Updated Title")
        self.assertEqual(task.status, Task.Status.IN_PROGRESS)

    def test_delete_task_manager_only(self):
        """Test only managers can delete tasks"""
        task = Task.objects.create(
            title="To Delete",
            assigned_to=self.developer,
            created_by=self.manager
        )
        
        # Try as developer
        response = self.client.post("/api/auth/login/", {
            "username": "developer",
            "password": "pass123"
        })
        dev_token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {dev_token}")
        
        response = self.client.delete(f"/api/tasks/{task.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Try as manager
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.manager_token}")
        response = self.client.delete(f"/api/tasks/{task.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify deleted
        self.assertFalse(Task.objects.filter(id=task.id).exists())


class CascadingStatusTest(APITestCase):
    """Test cascading status updates"""

    def setUp(self):
        self.manager = User.objects.create_user(
            username="manager",
            email="manager@test.com",
            password="pass123",
            role="manager",
            is_email_verified=True
        )
        
        response = self.client.post("/api/auth/login/", {
            "username": "manager",
            "password": "pass123"
        })
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_parent_complete_cascades_pending_children(self):
        """Test completing parent auto-completes pending children"""
        parent = Task.objects.create(
            title="Parent",
            status=Task.Status.IN_PROGRESS,
            assigned_to=self.manager,
            created_by=self.manager
        )
        child1 = Task.objects.create(
            title="Child 1",
            status=Task.Status.PENDING,
            parent_task=parent,
            assigned_to=self.manager,
            created_by=self.manager
        )
        child2 = Task.objects.create(
            title="Child 2",
            status=Task.Status.PENDING,
            parent_task=parent,
            assigned_to=self.manager,
            created_by=self.manager
        )
        
        # Complete parent
        response = self.client.patch(f"/api/tasks/{parent.id}/", {
            "status": "completed",
            "assigned_to": self.manager.id
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check children auto-completed
        child1.refresh_from_db()
        child2.refresh_from_db()
        self.assertEqual(child1.status, Task.Status.COMPLETED)
        self.assertEqual(child2.status, Task.Status.COMPLETED)
        
        # Check TaskHistory created
        self.assertTrue(TaskHistory.objects.filter(task=child1).exists())

    def test_parent_complete_fails_with_in_progress_child(self):
        """Test completing parent fails if child is in_progress"""
        parent = Task.objects.create(
            title="Parent",
            status=Task.Status.IN_PROGRESS,
            assigned_to=self.manager,
            created_by=self.manager
        )
        child = Task.objects.create(
            title="Child",
            status=Task.Status.IN_PROGRESS,
            parent_task=parent,
            assigned_to=self.manager,
            created_by=self.manager
        )
        
        # Try to complete parent
        response = self.client.patch(f"/api/tasks/{parent.id}/", {
            "status": "completed",
            "assigned_to": self.manager.id
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("child", response.data[0].lower())

    def test_child_blocked_blocks_parent(self):
        """Test blocking child auto-blocks parent"""
        parent = Task.objects.create(
            title="Parent",
            status=Task.Status.IN_PROGRESS,
            assigned_to=self.manager,
            created_by=self.manager
        )
        child = Task.objects.create(
            title="Child",
            status=Task.Status.IN_PROGRESS,
            parent_task=parent,
            assigned_to=self.manager,
            created_by=self.manager
        )
        
        # Block child
        response = self.client.patch(f"/api/tasks/{child.id}/", {
            "status": "blocked",
            "assigned_to": self.manager.id
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check parent auto-blocked
        parent.refresh_from_db()
        self.assertEqual(parent.status, Task.Status.BLOCKED)
        
        # Check TaskHistory
        history = TaskHistory.objects.filter(task=parent).first()
        self.assertIsNotNone(history)
        self.assertEqual(history.new_status, Task.Status.BLOCKED)


class PriorityEscalationTest(TestCase):
    """Test priority escalation logic"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="user",
            email="user@test.com",
            password="pass123",
            role="developer",
            is_email_verified=True
        )

    def test_escalate_task_within_24_hours(self):
        """Test task priority escalates when deadline within 24 hours"""
        deadline = timezone.now() + timedelta(hours=12)
        
        task = Task.objects.create(
            title="Urgent Task",
            status=Task.Status.IN_PROGRESS,
            priority=Task.Priority.LOW,
            deadline=deadline,
            assigned_to=self.user,
            created_by=self.user,
            priority_escalated=False
        )
        
        # Simulate middleware running (import and call directly)
        from tasks.middlewares.middlewares import PriorityEscalationMiddleware
        from django.http import HttpRequest
        
        def dummy_response(request):
            from django.http import HttpResponse
            return HttpResponse()
        
        middleware = PriorityEscalationMiddleware(dummy_response)
        request = HttpRequest()
        middleware(request)
        
        # Check task escalated
        task.refresh_from_db()
        self.assertEqual(task.priority, Task.Priority.MEDIUM)
        self.assertTrue(task.priority_escalated)
        
        # Check notification created
        self.assertTrue(Notification.objects.filter(task=task).exists())

    def test_no_escalation_if_already_escalated(self):
        """Test task doesn't escalate twice"""
        deadline = timezone.now() + timedelta(hours=12)
        
        task = Task.objects.create(
            title="Already Escalated",
            status=Task.Status.PENDING,
            priority=Task.Priority.MEDIUM,
            deadline=deadline,
            assigned_to=self.user,
            created_by=self.user,
            priority_escalated=True  # Already escalated
        )
        
        from tasks.middlewares.middlewares import PriorityEscalationMiddleware
        from django.http import HttpRequest, HttpResponse
        
        middleware = PriorityEscalationMiddleware(lambda r: HttpResponse())
        middleware(HttpRequest())
        
        # Priority should not change
        task.refresh_from_db()
        self.assertEqual(task.priority, Task.Priority.MEDIUM)

    def test_no_escalation_if_completed(self):
        """Test completed tasks don't escalate"""
        deadline = timezone.now() + timedelta(hours=12)
        
        task = Task.objects.create(
            title="Completed Task",
            status=Task.Status.COMPLETED,
            priority=Task.Priority.LOW,
            deadline=deadline,
            assigned_to=self.user,
            created_by=self.user
        )
        
        from tasks.middlewares.middlewares import PriorityEscalationMiddleware
        from django.http import HttpRequest, HttpResponse
        
        middleware = PriorityEscalationMiddleware(lambda r: HttpResponse())
        middleware(HttpRequest())
        
        # Priority should not change
        task.refresh_from_db()
        self.assertEqual(task.priority, Task.Priority.LOW)


class BulkUpdateTest(APITestCase):
    """Test bulk task updates"""

    def setUp(self):
        self.manager = User.objects.create_user(
            username="manager",
            email="manager@test.com",
            password="pass123",
            role="manager",
            is_email_verified=True
        )
        
        response = self.client.post("/api/auth/login/", {
            "username": "manager",
            "password": "pass123"
        })
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_bulk_update_success(self):
        """Test successful bulk status update"""
        task1 = Task.objects.create(
            title="Task 1",
            status=Task.Status.PENDING,
            assigned_to=self.manager,
            created_by=self.manager
        )
        task2 = Task.objects.create(
            title="Task 2",
            status=Task.Status.PENDING,
            assigned_to=self.manager,
            created_by=self.manager
        )
        
        data = {
            "task_ids": [task1.id, task2.id],
            "status": "in_progress"
        }
        
        response = self.client.put("/api/tasks/bulk-update/", data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["updated_count"], 2)
        
        # Verify updates
        task1.refresh_from_db()
        task2.refresh_from_db()
        self.assertEqual(task1.status, Task.Status.IN_PROGRESS)
        self.assertEqual(task2.status, Task.Status.IN_PROGRESS)

    def test_bulk_update_validates_parent_child(self):
        """Test bulk update validates parent-child rules"""
        parent = Task.objects.create(
            title="Parent",
            status=Task.Status.IN_PROGRESS,
            assigned_to=self.manager,
            created_by=self.manager
        )
        child = Task.objects.create(
            title="Child",
            status=Task.Status.IN_PROGRESS,
            parent_task=parent,
            assigned_to=self.manager,
            created_by=self.manager
        )
        
        # Try to complete parent with incomplete child
        data = {
            "task_ids": [parent.id],
            "status": "completed"
        }
        
        response = self.client.put("/api/tasks/bulk-update/", data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AnalyticsTest(APITestCase):
    """Test analytics endpoint"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="analyst",
            email="analyst@test.com",
            password="pass123",
            role="developer",
            is_email_verified=True
        )
        
        response = self.client.post("/api/auth/login/", {
            "username": "analyst",
            "password": "pass123"
        })
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_analytics_endpoint(self):
        """Test analytics returns correct structure"""
        # Create some tasks
        Task.objects.create(
            title="My Task 1",
            status=Task.Status.COMPLETED,
            assigned_to=self.user,
            created_by=self.user
        )
        Task.objects.create(
            title="My Task 2",
            status=Task.Status.IN_PROGRESS,
            assigned_to=self.user,
            created_by=self.user
        )
        
        response = self.client.get("/api/tasks/analytics/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("my_tasks", response.data)
        self.assertIn("team_tasks", response.data)
        self.assertIn("efficiency_score", response.data)
        
        # Check my_tasks structure
        my_tasks = response.data["my_tasks"]
        self.assertIn("total", my_tasks)
        self.assertIn("by_status", my_tasks)
        self.assertIn("overdue_count", my_tasks)
        self.assertEqual(my_tasks["total"], 2)
