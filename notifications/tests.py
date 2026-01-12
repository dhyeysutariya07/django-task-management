from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from tasks.models import Task
from notifications.models import Notification

User = get_user_model()


class NotificationModelTest(TestCase):
    """Test Notification model"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="notifyuser",
            email="notify@test.com",
            password="pass123",
            role="developer",
            is_email_verified=True
        )

    def test_create_notification(self):
        """Test creating a notification"""
        task = Task.objects.create(
            title="Test Task",
            assigned_to=self.user,
            created_by=self.user
        )
        
        notification = Notification.objects.create(
            user=self.user,
            task=task,
            message="Task priority escalated"
        )
        
        self.assertEqual(notification.user, self.user)
        self.assertEqual(notification.task, task)
        self.assertFalse(notification.read)

    def test_notification_without_task(self):
        """Test notification can exist without task"""
        notification = Notification.objects.create(
            user=self.user,
            message="General notification"
        )
        
        self.assertIsNone(notification.task)
        self.assertEqual(notification.message, "General notification")


class NotificationAPITest(APITestCase):
    """Test Notification API endpoints"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="user",
            email="user@test.com",
            password="pass123",
            role="developer",
            is_email_verified=True
        )
        
        response = self.client.post("/api/auth/login/", {
            "username": "user",
            "password": "pass123"
        })
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_list_notifications(self):
        """Test listing user notifications"""
        # Create notifications
        Notification.objects.create(
            user=self.user,
            message="Notification 1"
        )
        Notification.objects.create(
            user=self.user,
            message="Notification 2"
        )
        
        response = self.client.get("/api/notifications/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    # TODO: Fix this test - notification serializer needs to be updated
    # def test_mark_notification_read(self):
    #     """Test marking notification as read"""
    #     notification = Notification.objects.create(
    #         user=self.user,
    #         message="Unread notification"
    #     )
    #     
    #     self.assertFalse(notification.read)
    #     
    #     response = self.client.put(f"/api/notifications/{notification.id}/", {
    #         "user": self.user.id,
    #         "message": "Unread notification",
    #         "read": True
    #     })
    #     
    #     self.assertEqual(response.status_code, status.HTTP_200_OK)
    #     
    #     notification.refresh_from_db()
    #     self.assertTrue(notification.read)

    def test_user_only_sees_own_notifications(self):
        """Test users only see their own notifications"""
        other_user = User.objects.create_user(
            username="other",
            email="other@test.com",
            password="pass123",
            role="developer",
            is_email_verified=True
        )
        
        # Create notification for other user
        Notification.objects.create(
            user=other_user,
            message="Other user's notification"
        )
        
        # Create notification for current user
        Notification.objects.create(
            user=self.user,
            message="My notification"
        )
        
        response = self.client.get("/api/notifications/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["message"], "My notification")
