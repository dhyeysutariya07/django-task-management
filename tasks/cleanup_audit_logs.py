from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from tasks.models import APIAuditLog


class Command(BaseCommand):
    help = "Delete API audit logs older than 30 days"

    def handle(self, *args, **kwargs):
        cutoff = timezone.now() - timedelta(days=30)
        deleted, _ = APIAuditLog.objects.filter(timestamp__lt=cutoff).delete()
        self.stdout.write(self.style.SUCCESS(
            f"Deleted {deleted} old audit logs"
        ))
