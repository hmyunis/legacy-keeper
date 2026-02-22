import threading

_thread_locals = threading.local()

def get_current_user():
    request = getattr(_thread_locals, 'request', None)
    if request is not None:
        request_user = getattr(request, 'user', None)
        if getattr(request_user, 'is_authenticated', False):
            return request_user

    stored_user = getattr(_thread_locals, 'user', None)
    if getattr(stored_user, 'is_authenticated', False):
        return stored_user

    return None

class ThreadLocalUserMiddleware:
    """
    Middleware that captures the current user and request
    in thread-local storage for access in Signals.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.request = request
        _thread_locals.user = getattr(request, 'user', None)
        try:
            return self.get_response(request)
        finally:
            if hasattr(_thread_locals, 'request'):
                delattr(_thread_locals, 'request')
            if hasattr(_thread_locals, 'user'):
                delattr(_thread_locals, 'user')
