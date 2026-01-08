from rest_framework.permissions import BasePermission

class IsEmailVerified(BasePermission):
    message = "Email is not verified."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_email_verified
        )
