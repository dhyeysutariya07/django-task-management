from django.contrib.admin import SimpleListFilter
from datetime import timedelta, timezone

from tasks import models
from tasks.models import Task

class NeedsAttentionFilter(SimpleListFilter):
    title = 'Tasks Needing Attention'
    parameter_name = 'needs_attention'

    def lookups(self, request, model_admin):
        return (
            ('yes', 'Yes'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'yes':
            now = timezone.now()
            three_days_ago = now - timedelta(days=3)
            return queryset.filter(
                models.Q(status=Task.Status.BLOCKED) |
                models.Q(deadline__lt=three_days_ago, status__in=[Task.Status.PENDING, Task.Status.IN_PROGRESS]) |
                models.Q(actual_hours__gt=models.F('estimated_hours') * 1.5)
            )
        return queryset
