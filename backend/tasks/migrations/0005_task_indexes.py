# Generated manually for performance optimization

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0004_task_recurring_fields'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='task',
            index=models.Index(fields=['user', 'due_date'], name='tasks_task_user_id_due_date_idx'),
        ),
        migrations.AddIndex(
            model_name='task',
            index=models.Index(fields=['user', 'completed', 'overdue_notified'], name='tasks_task_user_completed_overdue_idx'),
        ),
        migrations.AddIndex(
            model_name='task',
            index=models.Index(fields=['user', 'is_recurring', 'parent_task'], name='tasks_task_user_recurring_parent_idx'),
        ),
        migrations.AddIndex(
            model_name='task',
            index=models.Index(fields=['parent_task', 'due_date'], name='tasks_task_parent_due_date_idx'),
        ),
        migrations.AddIndex(
            model_name='task',
            index=models.Index(fields=['user', 'created_at'], name='tasks_task_user_created_at_idx'),
        ),
    ]

