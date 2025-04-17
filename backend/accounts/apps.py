from django.apps import AppConfig


class AccountConfig(AppConfig):
    name = "accounts"

    def ready(self):
        """
        Import and connect signal handlers when Django starts.
        """
