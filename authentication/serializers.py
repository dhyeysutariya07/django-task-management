from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.exceptions import PermissionDenied

from TaskManagement import settings
from authentication.models import UserSession

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["username", "email", "password", "role"]

    def validate_role(self, value):
        if value not in ["manager", "developer", "auditor"]:
            raise serializers.ValidationError("Invalid role")
        return value


    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            role=validated_data["role"],
        )

        self.send_verification_email(user)
        return user
    
    def send_verification_email(self, user):
        verify_url = (
            f"http://localhost:8000/api/auth/verify-email/"
            f"{user.email_verification_token}/"
        )
        print("Mail Sent")
        send_mail(
            subject="Verify your email",
            message=f"Click the link to verify your email:\n{verify_url}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        request = self.context["request"]

        sessions = UserSession.objects.filter(user=user)

        if sessions.count() >= 3:
            raise PermissionDenied("Maximum 3 active sessions allowed.")

        UserSession.objects.create(
            user=user,
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            ip_address=request.META.get("REMOTE_ADDR", "0.0.0.0"),
        )

        return data

class UserMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "role",
        ]