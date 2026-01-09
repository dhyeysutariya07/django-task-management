import csv
from datetime import timedelta

from django.contrib import admin, messages
from django.contrib.admin.helpers import ACTION_CHECKBOX_NAME
from django.db.models import F, Q
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render
from django import forms
from django.utils import timezone
from django.utils.html import format_html
from django.contrib.auth import get_user_model

from .models import Task

User = get_user_model()


class TasksNeedingAttentionFilter(admin.SimpleListFilter):
    title = "Tasks Needing Attention"
    parameter_name = "needs_attention"

    def lookups(self, request, model_admin):
        return (("yes", "Needs Attention"),)

    def queryset(self, request, queryset):
        if self.value() == "yes":
            overdue_date = timezone.now().date() - timedelta(days=3)
            return queryset.filter(
                Q(status=Task.Status.BLOCKED)
                | Q(deadline__lt=overdue_date)
                | Q(actual_hours__gt=F("estimated_hours") * 1.5)
            )
        return queryset


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "priority",
        "assigned_to",
        "deadline",
        "status_colored",
    )

    list_filter = (
        TasksNeedingAttentionFilter,
        "status",
        "priority",
        "assigned_to",
    )

    actions = [
        "generate_weekly_report",
        "reassign_tasks",
    ]

    def status_colored(self, obj):
        color_map = {
            Task.Status.PENDING: "#6c757d",
            Task.Status.IN_PROGRESS: "#0d6efd",
            Task.Status.BLOCKED: "#dc3545",
            Task.Status.COMPLETED: "#198754",
        }

        color = color_map.get(obj.status, "#000")

        return format_html(
            '<span style="color:white; background:{}; '
            'padding:4px 10px; border-radius:12px; font-weight:600;">{}</span>',
            color,
            obj.get_status_display(),
        )

    status_colored.short_description = "Status"

    def generate_weekly_report(self, request, queryset):
        last_week = timezone.now() - timedelta(days=7)
        tasks = queryset.filter(created_at__gte=last_week)

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            'attachment; filename="weekly_task_report.csv"'
        )

        writer = csv.writer(response)
        writer.writerow([
            "ID",
            "Title",
            "Status",
            "Priority",
            "Assigned To",
            "Deadline",
            "Estimated Hours",
            "Actual Hours",
            "Created At",
        ])

        for task in tasks:
            writer.writerow([
                task.id,
                task.title,
                task.get_status_display(),
                task.get_priority_display(),
                task.assigned_to.username if task.assigned_to else "",
                task.deadline,
                task.estimated_hours,
                task.actual_hours,
                task.created_at,
            ])

        self.message_user(
            request,
            f"Weekly report generated with {tasks.count()} tasks.",
            messages.SUCCESS,
        )

        return response

    generate_weekly_report.short_description = "Generate Weekly Report (CSV)"

    def reassign_tasks(self, request, queryset):

        class ReassignForm(forms.Form):
            new_user = forms.ModelChoiceField(
                queryset=User.objects.all(),
                label="Reassign to",
            )

        # STEP 1: Show form
        if request.POST.get("apply") != "yes":
            form = ReassignForm()
            return render(
                request,
                "admin/reassign_tasks.html",
                {
                    "tasks": queryset,
                    "form": form,
                    "title": "Reassign selected tasks",
                    "action_checkbox_name": ACTION_CHECKBOX_NAME,
                },
            )

        # STEP 2: Process form
        form = ReassignForm(request.POST)
        if not form.is_valid():
            self.message_user(
                request,
                "Invalid form submission.",
                messages.ERROR,
            )
            return HttpResponseRedirect(request.get_full_path())

        new_user = form.cleaned_data["new_user"]

        # Warning if user overloaded
        active_tasks = Task.objects.filter(
            assigned_to=new_user
        ).exclude(status=Task.Status.COMPLETED).count()

        if active_tasks > 10:
            self.message_user(
                request,
                f"Warning: {new_user.username} already has {active_tasks} active tasks.",
                messages.WARNING,
            )

        updated_count = queryset.update(assigned_to=new_user)

        self.message_user(
            request,
            f"{updated_count} tasks reassigned to {new_user.username}.",
            messages.SUCCESS,
        )

        return HttpResponseRedirect(request.get_full_path())

    reassign_tasks.short_description = "Reassign Tasks"
