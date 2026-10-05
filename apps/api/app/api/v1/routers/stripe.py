import datetime
import logging
from typing import Any

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import get_current_user
from app.infrastructure.database.models import Subscription, User
from app.infrastructure.database.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/stripe", tags=["stripe"])


class CheckoutSessionCreate(BaseModel):
    price_id: str


@router.post("/checkout")
async def create_checkout_session(
    body: CheckoutSessionCreate,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    settings = get_settings()
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=500, detail="Stripe is not configured.")

    stripe.api_key = settings.stripe_secret_key

    try:
        checkout_session = stripe.checkout.Session.create(
            customer_email=current_user.email,
            client_reference_id=str(current_user.id),
            payment_method_types=["card"],
            line_items=[
                {
                    "price": body.price_id,
                    "quantity": 1,
                }
            ],
            mode="subscription",
            success_url=f"{settings.frontend_url}/pricing?status=success",
            cancel_url=f"{settings.frontend_url}/pricing?status=cancelled",
        )
        return {"url": checkout_session.url}
    except Exception as e:
        logger.error(f"Stripe checkout error: {e}")
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)) -> dict[str, str]:
    settings = get_settings()
    if not settings.stripe_secret_key or not settings.stripe_webhook_secret:
        raise HTTPException(status_code=500, detail="Stripe is not configured.")

    stripe.api_key = settings.stripe_secret_key
    webhook_secret = settings.stripe_webhook_secret

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")

    try:
        event = stripe.Webhook.construct_event(
            payload=payload, sig_header=sig_header, secret=webhook_secret
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid payload") from e
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail="Invalid signature") from e

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id_str = session.get("client_reference_id")
        stripe_customer_id = session.get("customer")
        subscription_id = session.get("subscription")

        if user_id_str and stripe_customer_id and subscription_id:
            try:
                sub = stripe.Subscription.retrieve(subscription_id)
                current_period_end = datetime.datetime.fromtimestamp(
                    sub.current_period_end, tz=datetime.UTC
                )
                plan_id = sub.plan.id if sub.plan else "unknown"
                status = sub.status

                # UPSERT subscription
                stmt = select(Subscription).where(Subscription.user_id == user_id_str)
                db_sub = db.scalars(stmt).first()

                if db_sub:
                    db_sub.stripe_customer_id = stripe_customer_id
                    db_sub.plan_id = plan_id
                    db_sub.status = status
                    db_sub.current_period_end = current_period_end
                else:
                    db_sub = Subscription(
                        user_id=user_id_str,
                        stripe_customer_id=stripe_customer_id,
                        plan_id=plan_id,
                        status=status,
                        current_period_end=current_period_end,
                    )
                    db.add(db_sub)

                db.commit()
            except Exception as e:
                logger.error(f"Error processing webhook: {e}")
                db.rollback()
                raise HTTPException(status_code=500, detail="Database error") from e

    return {"status": "success"}
