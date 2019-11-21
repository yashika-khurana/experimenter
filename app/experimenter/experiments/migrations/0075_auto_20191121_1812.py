# Generated by Django 2.1.11 on 2019-11-21 18:12

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [("experiments", "0074_auto_20191119_2241")]

    operations = [
        migrations.AlterField(
            model_name="experiment",
            name="type",
            field=models.CharField(
                choices=[
                    ("pref", "Pref-Flip Experiment"),
                    ("addon", "Add-On Experiment"),
                    ("generic", "Generic Experiment"),
                    ("rollout", "Staged Rollout"),
                ],
                default="pref",
                max_length=255,
            ),
        )
    ]
