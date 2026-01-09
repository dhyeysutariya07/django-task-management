from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction

from .models import Tag, Task, TaskHistory

User = get_user_model()

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "name"]


class TaskReadSerializer(serializers.ModelSerializer):
    assigned_to = serializers.StringRelatedField()
    created_by = serializers.StringRelatedField()
    tags = TagSerializer(many=True, read_only=True)
    parent_task = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "status",
            "priority",
            "assigned_to",
            "created_by",
            "parent_task",
            "estimated_hours",
            "actual_hours",
            "deadline",
            "tags",
            "created_at",
            "updated_at",
        ]


class TaskWriteSerializer(serializers.ModelSerializer):
    # Accept a list of tag names on input
    tags = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        write_only=True  # only used for input
    )

    # Read-only field for output
    tag_names = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Task
        fields = [
            "title",
            "description",
            "status",
            "priority",
            "assigned_to",
            "parent_task",
            "estimated_hours",
            "actual_hours",
            "deadline",
            "tags",        # write-only input
            "tag_names",   # read-only output
        ]

    def get_tag_names(self, obj):
        # return a list of tag names for the frontend
        return [tag.name for tag in obj.tags.all()]

    def validate_assigned_to(self, value):
        user = self.context["request"].user
        if user.role == "manager":
            return value
        if user.role == "developer":
            if value != user:
                raise serializers.ValidationError("Developers can only assign tasks to themselves.")
            return value
        raise serializers.ValidationError("Auditors are not allowed to create or modify tasks.")

    def validate_parent_task(self, value):
        if value and value == self.instance:
            raise serializers.ValidationError("Task cannot be its own parent.")
        return value

    def create(self, validated_data):
        tags_data = validated_data.pop("tags", [])
        task = Task.objects.create(
            created_by=self.context["request"].user,
            **validated_data
        )
        self._handle_tags(task, tags_data)
        return task

    def update(self, instance, validated_data):
        tags_data = validated_data.pop("tags", None)
        new_status = validated_data.get("status", instance.status)

        with transaction.atomic():  # ensure atomic updates
            # Check if status is changing
            if new_status and new_status != instance.status:
                # Cascading rules
                self._handle_cascading_status(instance, new_status)

            # normal update
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()

            if tags_data is not None:
                instance.tags.clear()
                self._handle_tags(instance, tags_data)

        return instance

    def _handle_tags(self, task, tags_data):
        for tag_name in tags_data:
            tag, _ = Tag.objects.get_or_create(name=tag_name)
            task.tags.add(tag)

    def _handle_cascading_status(self, task, new_status):

        if new_status == "completed":
            for child in task.children.all():
                if child.status == "pending":
                    old_status = child.status
                    child.status = "completed"
                    child.save()
                    TaskHistory.objects.create(
                        task=child,
                        changed_by=self.context["request"].user,
                        previous_status=old_status,
                        new_status="completed",
                        notes=f"Cascaded from parent task {task.id}"
                    )
                elif child.status in ["in_progress", "blocked"]:
                    raise serializers.ValidationError(
                        f"Cannot complete parent task because child task {child.id} is {child.status}"
                    )

        if task.parent_task and new_status == "blocked":
            parent = task.parent_task
            if parent.status != "blocked":
                old_status = parent.status
                parent.status = "blocked"
                parent.save()
                TaskHistory.objects.create(
                    task=parent,
                    changed_by=self.context["request"].user,
                    previous_status=old_status,
                    new_status="blocked",
                    notes=f"Child task {task.id} blocked"
                )

class TaskHistorySerializer(serializers.ModelSerializer):
    task_title = serializers.CharField(source='task.title', read_only=True)
    changed_by_name = serializers.CharField(source='changed_by.username', read_only=True)

    class Meta:
        model = TaskHistory
        fields = ['id', 'task', 'task_title', 'changed_by', 'changed_by_name', 'previous_status', 'new_status', 'timestamp', 'notes']

