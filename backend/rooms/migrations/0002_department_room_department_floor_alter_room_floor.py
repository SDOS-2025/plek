# Generated by Django 5.1.6 on 2025-04-14 09:43

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("rooms", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Department",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=100, unique=True)),
                ("description", models.TextField(default="No description provided")),
            ],
        ),
        migrations.AddField(
            model_name="room",
            name="department",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="rooms",
                to="rooms.department",
            ),
        ),
        migrations.CreateModel(
            name="Floor",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("number", models.IntegerField()),
                ("name", models.CharField(blank=True, max_length=100)),
                (
                    "building",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="floors",
                        to="rooms.building",
                    ),
                ),
            ],
            options={
                "unique_together": {("building", "number")},
            },
        ),
        migrations.AlterField(
            model_name="room",
            name="floor",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="rooms",
                to="rooms.floor",
            ),
        ),
    ]
