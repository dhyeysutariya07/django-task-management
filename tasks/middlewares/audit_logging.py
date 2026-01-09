import json
from django.utils import timezone
from django.utils.deprecation import MiddlewareMixin
from django.http import HttpRequest

from tasks.models import APIAuditLog


SENSITIVE_KEYS = {"password", "token", "secret"}


def mask_sensitive(data):
    if isinstance(data, dict):
        return {
            k: ("********" if k.lower() in SENSITIVE_KEYS else mask_sensitive(v))
            for k, v in data.items()
        }
    if isinstance(data, list):
        return [mask_sensitive(i) for i in data]
    return data


class AuditLoggingMiddleware(MiddlewareMixin):

    def process_response(self, request: HttpRequest, response):
        if request.path.startswith("/api/tasks/analytics/"):
            return response

        if not request.path.startswith("/api/"):
            return response

        request_body = None
        response_body = None

        if request.method in ("POST", "PUT", "PATCH"):
            try:
                raw_body = request.body.decode("utf-8")
                if raw_body:
                    request_body = mask_sensitive(json.loads(raw_body))
            except Exception:
                request_body = None

        # Log response body ONLY for errors
        if response.status_code >= 400:
            try:
                response_body = json.loads(response.content.decode("utf-8"))
            except Exception:
                response_body = None

        APIAuditLog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            endpoint=request.path,
            method=request.method,
            status_code=response.status_code,
            request_body=request_body,
            response_body=response_body,
            ip_address=self.get_client_ip(request),
            timestamp=timezone.now(),
        )

        return response

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0]
        return request.META.get("REMOTE_ADDR")
