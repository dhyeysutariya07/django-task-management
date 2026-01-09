from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, TaskHistoryViewSet 

router = DefaultRouter()
router.register("", TaskViewSet, basename="tasks")
router.register("history", TaskHistoryViewSet, basename="task-history") 

urlpatterns = router.urls
