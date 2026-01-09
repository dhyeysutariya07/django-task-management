from django.urls import path

from authentication.views import CustomTokenObtainPairView, ManagerDeveloperListView, MeView, RegisterView, VerifyEmailView, LogoutView

urlpatterns = [
    path("register/", RegisterView.as_view()),
    path("login/", CustomTokenObtainPairView.as_view()),
    path("logout/", LogoutView.as_view()),
    path("verify-email/<uuid:token>/", VerifyEmailView.as_view()),
    path("me/", MeView.as_view()),
    path("staff/", ManagerDeveloperListView.as_view(), name="manager-developer-list"),
]
