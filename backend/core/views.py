from django.conf import settings
from django.core.mail import send_mail
import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

logger = logging.getLogger(__name__)


@api_view(["POST"])
@permission_classes([AllowAny])
def contact_message(request):
    """
    Lightweight endpoint to receive contact form submissions.
    """
    required_fields = ["name", "email", "subject", "message"]
    data = {field: (request.data.get(field) or "").strip() for field in required_fields}
    missing = [field for field, value in data.items() if not value]

    if missing:
        return Response(
            {"detail": f"Missing required fields: {', '.join(missing)}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@taskmanager.local")
    recipients = getattr(settings, "CONTACT_RECIPIENTS", [from_email])

    try:
        send_mail(
            subject=f"[Task Manager Contact] {data['subject']}",
            message=f"From: {data['name']} <{data['email']}>\n\n{data['message']}",
            from_email=from_email,
            recipient_list=recipients,
            fail_silently=True,
        )
    except Exception as exc:  # pragma: no cover
        # We don't want to block the user on email delivery issues, just log it.
        logger.warning("Failed to send contact email: %s", exc)

    logger.info(
        "Contact message received", extra={"contact_email": data["email"], "subject": data["subject"]}
    )

    return Response(
        {"message": "Message sent! We will get back to you shortly."},
        status=status.HTTP_200_OK,
    )

