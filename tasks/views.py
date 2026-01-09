from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count, Avg, F, Q, ExpressionWrapper, DurationField
from django.utils.timezone import now
from tasks.models import Task
from django.db import transaction
from rest_framework import status
from authentication.permissions import IsEmailVerified
from .throttles import AuditorReadBypassThrottle
from .serializers import BulkTaskUpdateSerializer, TaskReadSerializer
from .serializers import TaskHistorySerializer, TaskWriteSerializer
from .permissions import AuditorWriteForbidden, TemporalTaskUpdatePermission
from drf_spectacular.utils import extend_schema

from .models import Task, TaskHistory

class TaskViewSet(ModelViewSet):
    queryset = Task.objects.all()
    permission_classes = [IsAuthenticated, IsEmailVerified,AuditorWriteForbidden]
    throttle_classes = [AuditorReadBypassThrottle]

    def get_permissions(self):
        permissions = super().get_permissions()
        if self.action in ["update", "partial_update"]:
            permissions.append(TemporalTaskUpdatePermission())
        return permissions

    def get_serializer_class(self):
        if self.action in ["list", "retrieve"]:
            return TaskReadSerializer
        return TaskWriteSerializer

    def perform_create(self, serializer):
        # Manager can assign to anyone → handled in serializer
        # Developer → enforced in serializer
        # Auditor → blocked → enforced in serializer
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user

        if user.role == "auditor":
            raise PermissionDenied("Auditors cannot modify tasks.")

        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user

        if user.role != "manager":
            raise PermissionDenied("Only managers can delete tasks.")
        instance.delete()



class TaskHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TaskHistory.objects.all().order_by('-timestamp')
    serializer_class = TaskHistorySerializer
    permission_classes = [IsAuthenticated]



class TaskAnalyticsView(APIView):
    """
    Returns analytics for tasks:
    - my_tasks: tasks assigned to current user
    - team_tasks: all tasks
    - efficiency_score
    """

    def get(self, request):
        user = request.user
        current_time = now()

        # ---------- My tasks ----------
        my_tasks_qs = Task.objects.filter(assigned_to=user)
        total_my_tasks = my_tasks_qs.count()

        # Count by status
        by_status = my_tasks_qs.values('status').annotate(count=Count('id'))
        by_status_dict = {item['status']: item['count'] for item in by_status}

        # Overdue tasks (pending or in_progress and deadline passed)
        overdue_count = my_tasks_qs.filter(
            status__in=[Task.Status.PENDING, Task.Status.IN_PROGRESS],
            deadline__lt=current_time
        ).count()

        # Average completion time in hours
        completed_tasks = my_tasks_qs.filter(status=Task.Status.COMPLETED)
        avg_completion_time = completed_tasks.annotate(
            duration=ExpressionWrapper(
                F('updated_at') - F('created_at'),
                output_field=DurationField()
            )
        ).aggregate(avg_duration=Avg('duration'))['avg_duration']

        avg_completion_hours = round(avg_completion_time.total_seconds() / 3600, 2) if avg_completion_time else 0

        # ---------- Team tasks ----------
        team_tasks_qs = Task.objects.all()
        total_team_tasks = team_tasks_qs.count()

        blocked_tasks_needing_attention = list(
            team_tasks_qs.filter(
                status=Task.Status.BLOCKED
            ).values('id', 'title')
        )

        priority_distribution = team_tasks_qs.values('priority').annotate(count=Count('id'))
        priority_distribution_dict = {item['priority']: item['count'] for item in priority_distribution}

        # ---------- Efficiency Score ----------
        completed_tasks_qs = completed_tasks.filter(actual_hours__isnull=False, estimated_hours__isnull=False)
        on_time_count = completed_tasks_qs.filter(updated_at__lte=F('deadline')).count()

        efficiency_score = 0
        if completed_tasks_qs.exists():
            ratio_bonus_sum = 0
            for task in completed_tasks_qs:
                actual = float(task.actual_hours)
                estimated = float(task.estimated_hours) if task.estimated_hours else 1
                ratio_bonus = 1.2 if actual <= estimated else 0.8
                ratio_bonus_sum += ratio_bonus

            avg_ratio_bonus = ratio_bonus_sum / completed_tasks_qs.count()
            efficiency_score = (on_time_count / completed_tasks_qs.count()) * avg_ratio_bonus * 100
            efficiency_score = round(efficiency_score, 2)

        data = {
            "my_tasks": {
                "total": total_my_tasks,
                "by_status": by_status_dict,
                "overdue_count": overdue_count,
                "avg_completion_time": f"{avg_completion_hours} hours"
            },
            "team_tasks": {
                "total": total_team_tasks,
                "blocked_tasks_needing_attention": blocked_tasks_needing_attention,
                "priority_distribution": priority_distribution_dict
            },
            "efficiency_score": efficiency_score
        }

        return Response(data)

@extend_schema(
    request=BulkTaskUpdateSerializer,
    responses={
        200: {"type": "object", "properties": {"updated_count": {"type": "integer"}}}
    },
    description="Bulk update task status atomically with parent-child validation"
)
class TaskBulkUpdateView(APIView):
    """
    Bulk update tasks with atomic validation
    """
    def put(self, request):
        serializer = BulkTaskUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        task_ids = serializer.validated_data['task_ids']
        new_status = serializer.validated_data['status']

        # Atomic transaction → all or nothing
        with transaction.atomic():
            tasks = Task.objects.filter(id__in=task_ids)
            for task in tasks:
                task.status = new_status
                task.save()

        return Response({"updated_count": len(task_ids)}, status=status.HTTP_200_OK)