from rest_framework.views import exception_handler

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response and hasattr(exc, "wait"):
        request = context["request"]
        if request.method not in ("GET", "HEAD", "OPTIONS"):
            response["X-Write-Available-In"] = str(int(exc.wait))

    return response
