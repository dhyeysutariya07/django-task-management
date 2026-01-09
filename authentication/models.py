import uuid
import pytz
from django.contrib.auth.models import AbstractUser
from django.db import models

from TaskManagement import settings



class User(AbstractUser):
    ROLE_MANAGER = "manager"
    ROLE_DEVELOPER = "developer"
    ROLE_AUDITOR = "auditor"

    ROLE_CHOICES = [
        (ROLE_MANAGER, "Manager"),
        (ROLE_DEVELOPER, "Developer"),
        (ROLE_AUDITOR, "Auditor"),
    ]

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
    )

    timezone = models.CharField(
        max_length=50,
        default="UTC",
        choices=[(tz, tz) for tz in pytz.common_timezones],
    )

    email_verification_token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        null=True,
        blank=True
    )
    
    is_email_verified = models.BooleanField(default=False)

    def __str__(self):
        return self.username

class UserSession(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sessions"
    )
    session_id = models.UUIDField(default=uuid.uuid4, unique=True)
    user_agent = models.TextField()
    ip_address = models.GenericIPAddressField()
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-last_seen']