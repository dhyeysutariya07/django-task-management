from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import TaskAnalyticsView, TaskBulkUpdateView, TaskViewSet, TaskHistoryViewSet

router = DefaultRouter()
router.register("", TaskViewSet, basename="tasks")
router.register("history", TaskHistoryViewSet, basename="task-history") 


urlpatterns=[
    path('analytics/', TaskAnalyticsView.as_view(), name='task-analytics'),
    path('bulk-update/', TaskBulkUpdateView.as_view(), name='task-bulk-update'),
]
urlpatterns += router.urls
