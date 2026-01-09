from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    task_title = serializers.CharField(source='task.title', read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'task', 'task_title', 'message', 'created_at']
