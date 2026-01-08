from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView

from authentication.views import RegisterView, VerifyEmailView, LogoutView

urlpatterns = [
    path("register/", RegisterView.as_view()),
    path("login/", TokenObtainPairView.as_view()),
    path("logout/", LogoutView.as_view()),
    path("verify-email/<uuid:token>/", VerifyEmailView.as_view()),
]
