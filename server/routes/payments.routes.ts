import { Router, Request, Response } from "express";
import {
  isStripeConfigured,
  createStripePaymentIntent,
  executeInvoicePayment,
} from "../stripeService";
import { requireAuth } from "../middleware/auth";
import { getFirebaseAdmin, getAdminFirestore } from "../firebaseAdmin";

export const paymentsRouter = Router();

// 1. Get Payment Configuration Status
paymentsRouter.get("/config", (req: Request, res: Response) => {
  return res.json({
    success: true,
    isConfigured: isStripeConfigured(),
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
    mode: isStripeConfigured() ? "live" : "sandbox",
  });
});

// 2. Create Payment Intent
paymentsRouter.post("/create-intent", requireAuth, async (req: Request, res: Response) => {
  try {
    const { amount, currency = "USD", invoiceId, clientId, clientEmail } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: "Valid payment amount is required." });
    }
    if (!invoiceId) {
      return res.status(400).json({ success: false, error: "Invoice ID is required." });
    }

    const result = await createStripePaymentIntent({
      amount: Number(amount),
      currency: String(currency),
      invoiceId: String(invoiceId),
      clientId: String(clientId || "client-demo"),
      clientEmail: clientEmail ? String(clientEmail) : undefined,
    });

    return res.json(result);
  } catch (error: any) {
    console.error("API /api/payments/create-intent error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to initialize payment intent.",
    });
  }
});

// 3. Process & Confirm Invoice Payment with Milestone Settlement
paymentsRouter.post("/process-invoice", requireAuth, async (req: Request, res: Response) => {
  try {
    const caller = (req as any).user;
    const callerUid = caller?.uid;

    const {
      invoiceId,
      amount,
      currency = "USD",
      clientId,
      clientEmail,
      clientName,
      symbioteId,
      symbioteName,
      projectId,
      projectName,
      cardBrand,
      last4,
      paymentIntentId,
      paymentMethod,
    } = req.body;

    if (!invoiceId || !amount) {
      return res.status(400).json({
        success: false,
        error: "Invoice ID and amount are required to execute payment.",
      });
    }

    // Verify invoice ownership in Firestore
    const adminApp = getFirebaseAdmin();
    if (adminApp) {
      const firestoreAdmin = getAdminFirestore(adminApp);
      const invoiceDoc = await firestoreAdmin.collection("invoices").doc(String(invoiceId)).get();
      if (invoiceDoc.exists) {
        const invData = invoiceDoc.data();
        const invoiceClientId = invData?.clientId || invData?.clientUid;
        const isClientOwner = Boolean(
          (invoiceClientId && invoiceClientId === callerUid) ||
          (clientId && clientId === callerUid)
        );
        const isAdminCaller = caller?.role === "admin" || caller?.admin === true;

        if (!isClientOwner && !isAdminCaller) {
          return res.status(403).json({
            success: false,
            error: "Forbidden: You are not authorized to settle this invoice.",
          });
        }
      }
    }

    const result = await executeInvoicePayment({
      invoiceId: String(invoiceId),
      amount: Number(amount),
      currency: String(currency),
      clientId: String(callerUid || clientId || "client-demo"),
      clientEmail: clientEmail ? String(clientEmail) : undefined,
      clientName: clientName ? String(clientName) : undefined,
      symbioteId: String(symbioteId || ""),
      symbioteName: symbioteName ? String(symbioteName) : undefined,
      projectId: projectId ? String(projectId) : undefined,
      projectName: projectName ? String(projectName) : undefined,
      cardBrand: cardBrand ? String(cardBrand) : undefined,
      last4: last4 ? String(last4) : undefined,
      paymentIntentId: paymentIntentId ? String(paymentIntentId) : undefined,
      paymentMethod: paymentMethod ? String(paymentMethod) : "credit_card",
    });

    return res.json(result);
  } catch (error: any) {
    console.error("API /api/payments/process-invoice error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to process invoice payment.",
    });
  }
});
