from datetime import timedelta
from django.utils.timezone import now
from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import AccessToken


class SilentRefreshMiddleware:
    """
    If access token is expiring within 2 minutes,
    issue a new one automatically.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.jwt_auth = JWTAuthentication()

    def __call__(self, request):
        response = self.get_response(request)

        header = request.headers.get("Authorization")
        if not header or not header.startswith("Bearer "):
            return response

        try:
            token_str = header.split(" ")[1]
            token = AccessToken(token_str)

            exp_timestamp = token["exp"]
            remaining = exp_timestamp - int(now().timestamp())

            # Last 2 minutes
            if remaining <= 120:
                user = self.jwt_auth.get_user(token)

                new_token = AccessToken.for_user(user)
                response["X-New-Access-Token"] = str(new_token)

        except Exception:
            pass  # invalid token → ignore

        return response