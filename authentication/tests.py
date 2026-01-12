from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.core import mail
from authentication.models import UserSession

User = get_user_model()


class UserModelTest(TestCase):
    """Test custom User model"""

    def test_create_user_with_role(self):
        """Test creating user with different roles"""
        user = User.objects.create_user(
            username="testdev",
            email="dev@test.com",
            password="testpass123",
            role="developer"
        )
        self.assertEqual(user.role, "developer")
        self.assertFalse(user.is_email_verified)
        self.assertIsNotNone(user.email_verification_token)

    def test_user_timezone_default(self):
        """Test user timezone defaults to UTC"""
        user = User.objects.create_user(
            username="testuser",
            email="test@test.com",
            password="testpass123",
            role="manager"
        )
        self.assertEqual(user.timezone, "UTC")


class RegistrationTest(APITestCase):
    """Test user registration flow"""

    def setUp(self):
        self.client = APIClient()
        self.register_url = "/api/auth/register/"

    def test_register_developer(self):
        """Test registering a developer account"""
        data = {
            "username": "newdev",
            "email": "newdev@test.com",
            "password": "securepass123",
            "role": "developer"
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check user created
        user = User.objects.get(username="newdev")
        self.assertEqual(user.role, "developer")
        self.assertFalse(user.is_email_verified)
        
        # Check email sent
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("verify", mail.outbox[0].subject.lower())

    def test_register_invalid_role(self):
        """Test registration with invalid role"""
        data = {
            "username": "baduser",
            "email": "bad@test.com",
            "password": "pass123",
            "role": "superadmin"  # Invalid role
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_weak_password(self):
        """Test registration with weak password"""
        data = {
            "username": "weakuser",
            "email": "weak@test.com",
            "password": "123",  # Too short
            "role": "developer"
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class EmailVerificationTest(APITestCase):
    """Test email verification flow"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="unverified",
            email="unverified@test.com",
            password="testpass123",
            role="developer"
        )
        self.token = self.user.email_verification_token

    def test_verify_email_success(self):
        """Test successful email verification"""
        url = f"/api/auth/verify-email/{self.token}/"
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh user from database
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_email_verified)
        self.assertIsNone(self.user.email_verification_token)

    def test_verify_email_invalid_token(self):
        """Test verification with invalid token"""
        url = "/api/auth/verify-email/invalid-token-12345/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_verify_already_verified(self):
        """Test verifying already verified email"""
        self.user.is_email_verified = True
        self.user.save()
        
        url = f"/api/auth/verify-email/{self.token}/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("already verified", response.data["message"].lower())


class LoginTest(APITestCase):
    """Test JWT authentication"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@test.com",
            password="testpass123",
            role="developer",
            is_email_verified=True
        )
        self.login_url = "/api/auth/login/"

    def test_login_success(self):
        """Test successful login"""
        data = {
            "username": "testuser",
            "password": "testpass123"
        }
        response = self.client.post(self.login_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_wrong_password(self):
        """Test login with wrong password"""
        data = {
            "username": "testuser",
            "password": "wrongpassword"
        }
        response = self.client.post(self.login_url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_nonexistent_user(self):
        """Test login with non-existent user"""
        data = {
            "username": "ghost",
            "password": "password123"
        }
        response = self.client.post(self.login_url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class SessionManagementTest(APITestCase):
    """Test concurrent session management"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="sessionuser",
            email="session@test.com",
            password="testpass123",
            role="developer",
            is_email_verified=True
        )
        self.login_url = "/api/auth/login/"

    def test_session_created_on_login(self):
        """Test that session is created on login"""
        initial_count = UserSession.objects.filter(user=self.user).count()
        
        data = {"username": "sessionuser", "password": "testpass123"}
        response = self.client.post(self.login_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        new_count = UserSession.objects.filter(user=self.user).count()
        self.assertEqual(new_count, initial_count + 1)

    def test_max_three_sessions(self):
        """Test that only 3 sessions are maintained"""
        # Create 3 sessions
        for i in range(3):
            UserSession.objects.create(
                user=self.user,
                user_agent=f"Browser{i}",
                ip_address="127.0.0.1"
            )
        
        self.assertEqual(UserSession.objects.filter(user=self.user).count(), 3)
        
        # Login again (4th session)
        data = {"username": "sessionuser", "password": "testpass123"}
        self.client.post(self.login_url, data)
        
        # Should still be 3 sessions (oldest deleted)
        self.assertEqual(UserSession.objects.filter(user=self.user).count(), 3)


class LogoutTest(APITestCase):
    """Test logout functionality"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="logoutuser",
            email="logout@test.com",
            password="testpass123",
            role="developer",
            is_email_verified=True
        )
        
        # Login to get tokens
        login_response = self.client.post("/api/auth/login/", {
            "username": "logoutuser",
            "password": "testpass123"
        })
        self.refresh_token = login_response.data["refresh"]
        self.access_token = login_response.data["access"]

    def test_logout_success(self):
        """Test successful logout"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        
        response = self.client.post("/api/auth/logout/", {
            "refresh": self.refresh_token
        })
        
        self.assertEqual(response.status_code, status.HTTP_205_RESET_CONTENT)

    def test_logout_without_token(self):
        """Test logout without refresh token"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        
        response = self.client.post("/api/auth/logout/", {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class MeViewTest(APITestCase):
    """Test /me endpoint"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="meuser",
            email="me@test.com",
            password="testpass123",
            role="manager",
            is_email_verified=True
        )
        
        # Login to get token
        login_response = self.client.post("/api/auth/login/", {
            "username": "meuser",
            "password": "testpass123"
        })
        self.access_token = login_response.data["access"]

    def test_me_endpoint(self):
        """Test getting current user info"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        
        response = self.client.get("/api/auth/me/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "meuser")
        self.assertEqual(response.data["role"], "manager")
        self.assertEqual(response.data["email"], "me@test.com")

    def test_me_endpoint_unauthenticated(self):
        """Test /me without authentication"""
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
