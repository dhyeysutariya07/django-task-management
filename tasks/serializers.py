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


from rest_framework import serializers
from django.db import transaction
from django.core.exceptions import PermissionDenied

from .models import Task, Tag
from .models import TaskHistory


class TaskWriteSerializer(serializers.ModelSerializer):
    # Accept tag names
    tags = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        write_only=True
    )

    # Output-only
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
            "tags",
            "tag_names",
        ]

    # ---------- Read helpers ----------
    def get_tag_names(self, obj):
        return [tag.name for tag in obj.tags.all()]

    # ---------- Parent validation ----------
    def validate_parent_task(self, value):
        if value and self.instance and value == self.instance:
            raise serializers.ValidationError("Task cannot be its own parent.")
        return value

    # ---------- CREATE ----------
    def create(self, validated_data):
        request = self.context["request"]
        user = request.user
        tags_data = validated_data.pop("tags", [])

        # FORCE assignment rules
        if user.role == "developer":
            validated_data["assigned_to"] = user
        elif user.role == "manager":
            # manager can assign freely
            pass
        else:
            raise PermissionDenied("Auditors cannot create tasks.")

        task = Task.objects.create(
            created_by=user,
            **validated_data
        )

        self._handle_tags(task, tags_data)
        return task

    # ---------- UPDATE ----------
    def update(self, instance, validated_data):
        request = self.context["request"]
        user = request.user
        tags_data = validated_data.pop("tags", None)
        new_status = validated_data.get("status", instance.status)

        #  FORCE assignment rules on update
        if user.role == "developer":
            validated_data["assigned_to"] = user
        elif user.role == "manager":
            pass
        else:
            raise PermissionDenied("Auditors cannot modify tasks.")

        with transaction.atomic():
            if new_status != instance.status:
                self._handle_cascading_status(instance, new_status)

            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()

            if tags_data is not None:
                instance.tags.clear()
                self._handle_tags(instance, tags_data)

        return instance

    # ---------- TAG HANDLING ----------
    def _handle_tags(self, task, tags_data):
        for tag_name in tags_data:
            tag, _ = Tag.objects.get_or_create(name=tag_name)
            task.tags.add(tag)

    # ---------- CASCADING STATUS ----------
    def _handle_cascading_status(self, task, new_status):
        user = self.context["request"].user

        if new_status == Task.Status.COMPLETED:
            for child in task.children.all():
                if child.status == Task.Status.PENDING:
                    old_status = child.status
                    child.status = Task.Status.COMPLETED
                    child.save()
                    TaskHistory.objects.create(
                        task=child,
                        changed_by=user,
                        previous_status=old_status,
                        new_status=Task.Status.COMPLETED,
                        notes=f"Cascaded from parent task {task.id}"
                    )
                elif child.status in [
                    Task.Status.IN_PROGRESS,
                    Task.Status.BLOCKED
                ]:
                    raise serializers.ValidationError(
                        f"Cannot complete parent task because child task {child.id} is {child.status}"
                    )

        if task.parent_task and new_status == Task.Status.BLOCKED:
            parent = task.parent_task
            if parent.status != Task.Status.BLOCKED:
                old_status = parent.status
                parent.status = Task.Status.BLOCKED
                parent.save()
                TaskHistory.objects.create(
                    task=parent,
                    changed_by=user,
                    previous_status=old_status,
                    new_status=Task.Status.BLOCKED,
                    notes=f"Child task {task.id} blocked"
                )


class TaskHistorySerializer(serializers.ModelSerializer):
    task_title = serializers.CharField(source='task.title', read_only=True)
    changed_by_name = serializers.CharField(source='changed_by.username', read_only=True)

    class Meta:
        model = TaskHistory
        fields = ['id', 'task', 'task_title', 'changed_by', 'changed_by_name', 'previous_status', 'new_status', 'timestamp', 'notes']


class BulkTaskUpdateSerializer(serializers.Serializer):
    task_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False
    )
    status = serializers.ChoiceField(choices=Task.Status.choices)

    def validate(self, attrs):
        task_ids = attrs.get('task_ids')
        status = attrs.get('status')

        tasks = Task.objects.filter(id__in=task_ids).select_related('parent_task')
        if tasks.count() != len(task_ids):
            raise serializers.ValidationError("Some tasks do not exist.")

        # Validate parent-child rules
        for task in tasks:
            # If a parent is being marked COMPLETED, all children must be COMPLETED
            if status == Task.Status.COMPLETED:
                incomplete_children = task.children.exclude(status=Task.Status.COMPLETED)
                if incomplete_children.exists():
                    raise serializers.ValidationError(
                        f"Cannot complete parent task '{task.title}' with incomplete children."
                    )

            # If a child is being moved to BLOCKED, maybe check parent rules (optional)
            if status == Task.Status.BLOCKED and task.parent_task:
                if task.parent_task.status == Task.Status.COMPLETED:
                    raise serializers.ValidationError(
                        f"Cannot block child '{task.title}' under completed parent '{task.parent_task.title}'."
                    )

        return attrs