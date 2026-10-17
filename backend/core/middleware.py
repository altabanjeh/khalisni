from django.utils import translation

from core.i18n import request_language


class RequestLanguageMiddleware:
    """Serve Django and DRF built-in messages in the request language.

    Same rule as ``core.i18n.request_language``: English when the client asks
    for English, Arabic (the site default) otherwise.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        language = request_language(request)
        translation.activate(language)
        request.LANGUAGE_CODE = language
        try:
            return self.get_response(request)
        finally:
            translation.deactivate()
