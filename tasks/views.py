from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework import viewsets
from authentication.permissions import IsEmailVerified
from .throttles import AuditorReadBypassThrottle
from .serializers import TaskReadSerializer
from .serializers import TaskHistorySerializer, TaskWriteSerializer
from .permissions import AuditorWriteForbidden, TemporalTaskUpdatePermission

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
