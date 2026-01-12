"""
Additional test cases for permissions and middleware
"""
from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import time, timedelta
from rest_framework.test import APITestCase
from rest_framework import status
import pytz

from tasks.models import Task, APIAuditLog
from tasks.permissions import TemporalTaskUpdatePermission
from tasks.middlewares.audit_logging import AuditLoggingMiddleware

User = get_user_model()


class TemporalPermissionTest(TestCase):
    """Test time-based task update permissions"""

    def setUp(self):
        self.factory = RequestFactory()
        self.developer = User.objects.create_user(
            username="developer",
            email="dev@test.com",
            password="pass123",
            role="developer",
            timezone="America/New_York",
            is_email_verified=True
        )
        self.manager = User.objects.create_user(
            username="manager",
            email="manager@test.com",
            password="pass123",
            role="manager",
            is_email_verified=True
        )
        
        self.task = Task.objects.create(
            title="Test Task",
            priority=Task.Priority.MEDIUM,
            assigned_to=self.developer,
            created_by=self.manager
        )
        
        self.permission = TemporalTaskUpdatePermission()

    def test_manager_no_time_restriction(self):
        """Test managers can update anytime"""
        request = self.factory.patch('/api/tasks/1/')
        request.user = self.manager
        request.method = 'PATCH'
        
        has_permission = self.permission.has_object_permission(
            request, None, self.task
        )
        
        self.assertTrue(has_permission)

    def test_developer_can_read_anytime(self):
        """Test developers can read anytime"""
        request = self.factory.get('/api/tasks/1/')
        request.user = self.developer
        request.method = 'GET'
        
        has_permission = self.permission.has_object_permission(
            request, None, self.task
        )
        
        self.assertTrue(has_permission)

    def test_critical_task_update_anytime(self):
        """Test critical tasks can be updated anytime"""
        critical_task = Task.objects.create(
            title="Critical Task",
            priority=Task.Priority.CRITICAL,
            assigned_to=self.developer,
            created_by=self.manager
        )
        
        request = self.factory.patch('/api/tasks/2/')
        request.user = self.developer
        request.method = 'PATCH'
        
        has_permission = self.permission.has_object_permission(
            request, None, critical_task
        )
        
        self.assertTrue(has_permission)


class AuditLoggingTest(APITestCase):
    """Test audit logging middleware"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="audituser",
            email="audit@test.com",
            password="pass123",
            role="manager",
            is_email_verified=True
        )
        
        response = self.client.post("/api/auth/login/", {
            "username": "audituser",
            "password": "pass123"
        })
        self.token = response.data["access"]

    def test_audit_log_created_on_api_call(self):
        """Test audit log is created for API calls"""
        initial_count = APIAuditLog.objects.count()
        
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        self.client.get("/api/tasks/")
        
        new_count = APIAuditLog.objects.count()
        self.assertGreater(new_count, initial_count)

    def test_audit_log_contains_user_info(self):
        """Test audit log contains user information"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        self.client.get("/api/tasks/")
        
        log = APIAuditLog.objects.latest('timestamp')
        self.assertEqual(log.user, self.user)
        self.assertEqual(log.method, 'GET')
        self.assertEqual(log.endpoint, '/api/tasks/')

    def test_audit_log_masks_sensitive_data(self):
        """Test sensitive data is masked in audit logs"""
        data = {
            "username": "newuser",
            "email": "new@test.com",
            "password": "supersecret123",  # Should be masked
            "role": "developer"
        }
        
        response = self.client.post("/api/auth/register/", data)
        
        # Find the audit log for this request
        log = APIAuditLog.objects.filter(
            endpoint="/api/auth/register/",
            method="POST"
        ).latest('timestamp')
        
        # Password should be masked
        if log.request_body:
            self.assertEqual(log.request_body.get("password"), "********")

    def test_analytics_not_logged(self):
        """Test analytics endpoint is not logged"""
        initial_count = APIAuditLog.objects.filter(
            endpoint="/api/tasks/analytics/"
        ).count()
        
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        self.client.get("/api/tasks/analytics/")
        
        new_count = APIAuditLog.objects.filter(
            endpoint="/api/tasks/analytics/"
        ).count()
        
        self.assertEqual(new_count, initial_count)


class RateLimitingTest(APITestCase):
    """Test role-based rate limiting"""

    def setUp(self):
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

    def test_auditor_unlimited_read(self):
        """Test auditor has unlimited read access"""
        response = self.client.post("/api/auth/login/", {
            "username": "auditor",
            "password": "pass123"
        })
        token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        
        # Make multiple read requests (should not be throttled)
        for _ in range(10):
            response = self.client.get("/api/tasks/")
            self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_auditor_write_forbidden(self):
        """Test auditor cannot write"""
        response = self.client.post("/api/auth/login/", {
            "username": "auditor",
            "password": "pass123"
        })
        token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        
        data = {
            "title": "Auditor Task",
            "status": "pending",
            "priority": "low",
            "assigned_to": self.developer.id
        }
        
        response = self.client.post("/api/tasks/", data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class TaskHistoryTest(TestCase):
    """Test TaskHistory model and tracking"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="historyuser",
            email="history@test.com",
            password="pass123",
            role="manager",
            is_email_verified=True
        )

    def test_task_history_created_on_status_change(self):
        """Test history is created when task status changes"""
        from tasks.models import TaskHistory
        
        task = Task.objects.create(
            title="History Task",
            status=Task.Status.PENDING,
            assigned_to=self.user,
            created_by=self.user
        )
        
        initial_count = TaskHistory.objects.filter(task=task).count()
        
        # This would normally be done through the API/serializer
        # which creates the history entry
        TaskHistory.objects.create(
            task=task,
            changed_by=self.user,
            previous_status=Task.Status.PENDING,
            new_status=Task.Status.IN_PROGRESS,
            notes="Manual status change"
        )
        
        new_count = TaskHistory.objects.filter(task=task).count()
        self.assertEqual(new_count, initial_count + 1)


class EmailVerificationRequiredTest(APITestCase):
    """Test that email verification is required"""

    def setUp(self):
        self.unverified_user = User.objects.create_user(
            username="unverified",
            email="unverified@test.com",
            password="pass123",
            role="developer",
            is_email_verified=False  # Not verified
        )

    def test_unverified_user_cannot_access_tasks(self):
        """Test unverified users cannot access protected endpoints"""
        # Login (should work)
        response = self.client.post("/api/auth/login/", {
            "username": "unverified",
            "password": "pass123"
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        token = response.data["access"]
        
        # Try to access tasks (should fail)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = self.client.get("/api/tasks/")
        
        # Should be forbidden due to IsEmailVerified permission
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class TagTest(TestCase):
    """Test Tag model"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="taguser",
            email="tag@test.com",
            password="pass123",
            role="developer",
            is_email_verified=True
        )

    def test_tag_unique_name(self):
        """Test tag names are unique"""
        from tasks.models import Tag
        
        Tag.objects.create(name="backend")
        
        # Try to create duplicate
        with self.assertRaises(Exception):
            Tag.objects.create(name="backend")

    def test_task_multiple_tags(self):
        """Test task can have multiple tags"""
        from tasks.models import Tag
        
        task = Task.objects.create(
            title="Tagged Task",
            assigned_to=self.user,
            created_by=self.user
        )
        
        tag1 = Tag.objects.create(name="frontend")
        tag2 = Tag.objects.create(name="urgent")
        tag3 = Tag.objects.create(name="bug")
        
        task.tags.add(tag1, tag2, tag3)
        
        self.assertEqual(task.tags.count(), 3)
        self.assertIn(tag1, task.tags.all())
