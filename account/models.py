from django.db import models

# Create your models here.

class Account(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(max_length=100)
    password = models.CharField(max_length=100)

    def __str__(self):
        return str(self.first_name) + " " + str(self.last_name)
