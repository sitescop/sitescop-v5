import Stripe from 'stripe';
import { InvoiceStatus, PaymentMethod } from '@prisma/client';
import type { AuthUser } from '@sitescop/shared-types';
import type { StripeCheckoutResponse } from '@sitescop/shared-types';
import { config } from '../../config.js';
import { AppError } from '../../shared/http/errors.js';
import { markInvoicePaidByStripe } from '../invoices/invoices.service.js';
import { assertClientOwnsInvoice } from './portal.service.js';

let stripeClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(config.stripe.secretKey?.trim());
}

function getStripe(): Stripe {
  const secretKey = config.stripe.secretKey?.trim();
  if (!secretKey) {
    throw new AppError('Online payments are not configured', 'STRIPE_NOT_CONFIGURED');
  }
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }
  return stripeClient;
}

export async function createInvoiceCheckoutSession(
  user: AuthUser,
  invoiceId: string,
): Promise<StripeCheckoutResponse> {
  const invoice = await assertClientOwnsInvoice(user, invoiceId);

  if (invoice.status === InvoiceStatus.PAID) {
    throw new AppError('This invoice has already been paid', 'INVALID_STATE');
  }
  if (invoice.status === InvoiceStatus.VOID || invoice.status === InvoiceStatus.DRAFT) {
    throw new AppError('This invoice cannot be paid online', 'INVALID_STATE');
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: user.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'aud',
          unit_amount: invoice.totalCents,
          product_data: {
            name: invoice.description,
            description: invoice.invoiceNumber,
          },
        },
      },
    ],
    metadata: {
      invoiceId: invoice.id,
      companyId: invoice.companyId,
      userId: user.id,
    },
    success_url: `${config.webAppUrl}/portal?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.webAppUrl}/portal?payment=cancelled`,
  });

  if (!session.url) {
    throw new AppError('Unable to start checkout', 'STRIPE_ERROR');
  }

  return { url: session.url };
}

export async function confirmStripeCheckoutSession(
  user: AuthUser,
  sessionId: string,
  request?: import('fastify').FastifyRequest,
): Promise<{ invoiceId: string; alreadyPaid: boolean }> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== 'paid') {
    throw new AppError('Payment was not completed', 'PAYMENT_INCOMPLETE');
  }

  const invoiceId = session.metadata?.invoiceId;
  const companyId = session.metadata?.companyId;
  if (!invoiceId || !companyId || companyId !== user.companyId) {
    throw new AppError('Invalid payment session', 'INVALID_SESSION');
  }

  await assertClientOwnsInvoice(user, invoiceId);

  const paymentReference = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.id;

  const result = await markInvoicePaidByStripe(
    user,
    invoiceId,
    paymentReference,
    request,
  );

  return { invoiceId, alreadyPaid: result.alreadyPaid };
}
