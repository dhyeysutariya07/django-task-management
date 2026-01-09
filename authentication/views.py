from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.generics import CreateAPIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import IsAuthenticated
from authentication.models import User
from authentication.serializers import CustomTokenObtainPairSerializer, RegisterSerializer, UserMinimalSerializer
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils.timezone import now
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import AccessToken

from .models import UserSession


    
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")

        if not refresh_token:
            return Response(
                {"detail": "Refresh token required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            return Response(
                {"detail": "Invalid or expired token"},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {"message": "Logged out successfully"},
            status=status.HTTP_205_RESET_CONTENT
        )
    
class RegisterView(CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = []

class VerifyEmailView(APIView):
    permission_classes = []

    def get(self, request, token):
        user = get_object_or_404(User, email_verification_token=token)

        if user.is_email_verified:
            return Response(
                {"message": "Email already verified"},
                status=status.HTTP_200_OK
            )

        user.is_email_verified = True
        user.email_verification_token = None
        user.save()

        return Response(
            {"message": "Email verified successfully"},
            status=status.HTTP_200_OK
        )
    
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class MeView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        token = request.auth  

        UserSession.objects.filter(
            user=user,
            user_agent=request.META.get("HTTP_USER_AGENT", "")
        ).update(last_seen=now())

        response = Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": getattr(user, "role", None),
        })

        exp_timestamp = token["exp"]
        remaining_seconds = exp_timestamp - int(now().timestamp())

        if remaining_seconds <= 120:  # last 2 minutes
            new_token = AccessToken.for_user(user)
            response["X-New-Access-Token"] = str(new_token)

        return response
    
class ManagerDeveloperListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        users = User.objects.filter(
            role__in=["manager", "developer"]
        ).order_by("username")

        serializer = UserMinimalSerializer(users, many=True)
        return Response(serializer.data)
