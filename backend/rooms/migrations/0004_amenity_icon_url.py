# Generated by Django 5.1.6 on 2025-04-14 23:34

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("rooms", "0003_alter_amenity_options_alter_building_options_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="amenity",
            name="icon_url",
            field=models.URLField(blank=True, help_text="URL to the amenity icon image", null=True),
        ),
    ]
