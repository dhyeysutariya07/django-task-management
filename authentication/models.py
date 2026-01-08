import uuid
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

    email_verification_token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        null=True,
        blank=True
    )
    
    is_email_verified = models.BooleanField(default=False)

    def __str__(self):
        return self.username
