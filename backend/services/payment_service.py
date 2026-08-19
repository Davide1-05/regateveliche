"""
Stripe Payment Service for Regatta Registration Payments.

This module provides integration with Stripe's payment API for processing
regatta entry fees and related transactions.

FAKE CREDENTIALS - Replace with real values from your Stripe dashboard:
- STRIPE_SECRET_KEY: sk_test_4eC39HqLyjWDarjtT1zdp7dc (Test Mode)
- STRIPE_WEBHOOK_SECRET: whsec_fake_webhook_secret_key_here

To get real credentials:
1. Create account at https://dashboard.stripe.com/register
2. Navigate to Developers > API Keys
3. Use test mode keys for development
"""

import stripe
from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel

# Import settings
try:
    from backend.config import get_settings
except ImportError:
    # Fallback if config not available
    class Settings:
        STRIPE_SECRET_KEY: str = "sk_test_4eC39HqLyjWDarjtT1zdp7dc"
        STRIPE_WEBHOOK_SECRET: str = "whsec_fake_webhook_secret_key_here"
    
    def get_settings():
        return Settings()

# Initialize Stripe with test credentials
settings = get_settings()
stripe.api_key = settings.STRIPE_SECRET_KEY or "sk_test_4eC39HqLyjWDarjtT1zdp7dc"


class PaymentIntentRequest(BaseModel):
    """Request model for creating a Stripe Payment Intent."""
    amount: float  # Amount in cents (Stripe uses smallest currency unit)
    currency: str = "eur"
    description: str = "Regatta Registration Fee"
    metadata: Dict[str, Any] = {}


class PaymentIntentResponse(BaseModel):
    """Response model for Stripe Payment Intent creation."""
    client_secret: str
    payment_intent_id: str
    status: str
    amount: int  # In cents
    currency: str


class WebhookEvent(BaseModel):
    """Stripe webhook event payload."""
    id: str
    type: str
    data: Dict[str, Any]
    created: int


def create_payment_intent(
    amount: float,
    currency: str = "eur",
    description: str = "Regatta Registration Fee",
    metadata: Optional[Dict[str, Any]] = None
) -> PaymentIntentResponse:
    """
    Create a Stripe Payment Intent for charging the customer.
    
    Args:
        amount: Amount in EUR (will be converted to cents)
        currency: Currency code (default: EUR)
        description: Payment description
        metadata: Optional metadata to attach to payment
    
    Returns:
        PaymentIntentResponse with client_secret for frontend integration
    
    Example:
        >>> response = create_payment_intent(150.0, "eur", "Regatta Entry")
        >>> print(response.client_secret)  # Use this in frontend
    """
    try:
        # Convert EUR to cents (Stripe uses smallest currency unit)
        amount_cents = int(amount * 100)
        
        payment_intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency=currency,
            description=description,
            metadata={
                "created_at": datetime.utcnow().isoformat(),
                **(metadata or {})
            }
        )
        
        return PaymentIntentResponse(
            client_secret=payment_intent.client_secret,
            payment_intent_id=payment_intent.id,
            status=payment_intent.status,
            amount=payment_intent.amount,
            currency=payment_intent.currency
        )
    except stripe.error.StripeError as e:
        raise Exception(f"Stripe API error: {str(e)}")


def confirm_payment_intent(payment_intent_id: str) -> Dict[str, Any]:
    """
    Confirm and capture a Payment Intent.
    
    Args:
        payment_intent_id: Stripe Payment Intent ID
    
    Returns:
        Payment intent object with updated status
    """
    try:
        payment_intent = stripe.PaymentIntent.confirm(payment_intent_id)
        return {
            "status": payment_intent.status,
            "payment_intent_id": payment_intent.id,
            "amount_charged": payment_intent.amount_received if hasattr(payment_intent, 'amount_received') else 0
        }
    except stripe.error.StripeError as e:
        raise Exception(f"Failed to confirm payment: {str(e)}")


def retrieve_payment_intent(payment_intent_id: str) -> Dict[str, Any]:
    """
    Retrieve the status of a Payment Intent.
    
    Args:
        payment_intent_id: Stripe Payment Intent ID
    
    Returns:
        Payment intent details as dictionary
    """
    try:
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        return {
            "id": payment_intent.id,
            "status": payment_intent.status,
            "amount": payment_intent.amount,
            "currency": payment_intent.currency,
            "receipt_url": getattr(payment_intent, 'receipt_url', None),
            "created": datetime.fromtimestamp(payment_intent.created).isoformat() if hasattr(payment_intent, 'created') else None
        }
    except stripe.error.StripeError as e:
        raise Exception(f"Failed to retrieve payment intent: {str(e)}")


def create_refund(payment_intent_id: str, amount: Optional[int] = None) -> Dict[str, Any]:
    """
    Create a refund for a successful payment.
    
    Args:
        payment_intent_id: Original Payment Intent ID
        amount: Amount to refund in cents (optional, defaults to full refund)
    
    Returns:
        Refund details as dictionary
    """
    try:
        refund_amount = amount if amount else None
        
        refund = stripe.Refund.create(
            payment_intent=payment_intent_id,
            amount=refund_amount
        )
        
        return {
            "id": refund.id,
            "status": refund.status,
            "amount": refund.amount,
            "currency": refund.currency,
            "created": datetime.fromtimestamp(refund.created).isoformat() if hasattr(refund, 'created') else None
        }
    except stripe.error.StripeError as e:
        raise Exception(f"Failed to create refund: {str(e)}")


def verify_webhook_signature(payload: bytes, signature: str) -> bool:
    """
    Verify that a webhook request came from Stripe.
    
    Args:
        payload: Raw request body bytes
        signature: Stripe-Signature header value
    
    Returns:
        True if signature is valid
    """
    try:
        webhook_secret = settings.STRIPE_WEBHOOK_SECRET or "whsec_fake_webhook_secret_key_here"
        
        event = stripe.Webhook.construct_event(
            payload,
            signature,
            webhook_secret
        )
        return True
    except (stripe.error.SignatureVerificationError, ValueError):
        return False


def handle_payment_webhook(payload: bytes, signature: str) -> Optional[str]:
    """
    Process incoming Stripe webhook events.
    
    Args:
        payload: Raw request body bytes
        signature: Stripe-Signature header value
    
    Returns:
        Status message or None if event not handled
    """
    # Verify webhook signature first
    if not verify_webhook_signature(payload, signature):
        raise Exception("Webhook signature verification failed")
    
    # Parse the event
    try:
        import json
        event_dict = json.loads(payload.decode('utf-8'))
        event_type = event_dict.get('type')
        
        # Handle payment succeeded
        if event_type == 'payment_intent.succeeded':
            data = event_dict.get('data', {}).get('object', {})
            print(f"Payment succeeded: {data.get('id')} - Amount: {data.get('amount')}")
            return "Payment completed successfully"
        
        # Handle payment failed
        elif event_type == 'payment_intent.payment_failed':
            data = event_dict.get('data', {}).get('object', {})
            print(f"Payment failed: {data.get('id')} - Error: {data.get('last_payment_error')}")
            return "Payment failed"
        
        # Handle refund created
        elif event_type == 'refund.created':
            data = event_dict.get('data', {}).get('object', {})
            print(f"Refund created: {data.get('id')}")
            return "Refund processed"
        
        return None  # Event not handled
        
    except Exception as e:
        raise Exception(f"Failed to process webhook: {str(e)}")


# Payment status constants for database storage
PAYMENT_STATUS_PENDING = "pending"
PAYMENT_STATUS_SUCCEEDED = "succeeded"
PAYMENT_STATUS_FAILED = "failed"
PAYMENT_STATUS_REFUNDED = "refunded"
PAYMENT_STATUS_CANCELED = "canceled"