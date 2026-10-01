import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { VerificationRequest, VerificationRequestStatus, NexxoUser } from '../types';
import { createInAppNotification } from './notificationService';

export const NEXXO_OFFICIAL_UPI_ID = '7250241163@okbizaxis';
export const NEXXO_SUPPORT_WHATSAPP_NUMBER = '7352622862';
export const NEXXO_SUPPORT_WHATSAPP_INTERNATIONAL = '+91 7352622862';

export function getWhatsAppSupportUrl(customMessage?: string): string {
  const text = customMessage || 'Hi NEXXO Support, I need help regarding my Blue Tick verification payment.';
  return `https://wa.me/917352622862?text=${encodeURIComponent(text)}`;
}

export interface SubmitVerificationParams {
  currentUser: NexxoUser;
  plan: 'pro' | 'vip';
  fullName: string;
  idDocumentType: string;
  idDocumentNumber?: string;
  idDocumentPhotoUrl?: string;
  category: string;
  paymentMethod: string;
  paymentTransactionId: string;
  paymentScreenshotUrl?: string;
  autoRenew?: boolean;
  autoPayMethod?: 'upi_autopay' | 'card_recurring' | 'manual';
}

/**
 * Submit an official application for Paid Blue Tick Verification.
 * Strictly writes with status: 'pending' so no user can self-grant verification.
 */
export async function submitVerificationRequest(params: SubmitVerificationParams): Promise<string> {
  const {
    currentUser,
    plan,
    fullName,
    idDocumentType,
    idDocumentNumber = '',
    idDocumentPhotoUrl = '',
    category,
    paymentMethod,
    paymentTransactionId,
    paymentScreenshotUrl = '',
    autoRenew = true,
    autoPayMethod = 'upi_autopay',
  } = params;

  // Validation
  if (currentUser.isVerified && currentUser.premiumTier === 'vip') {
    throw new Error('Your profile already has verified VIP status.');
  }

  const cleanTxId = paymentTransactionId.trim();
  if (!cleanTxId || cleanTxId.length < 4) {
    throw new Error('A valid payment Transaction / UTR reference ID (min 4 characters) is required.');
  }

  const cleanFullName = fullName.trim();
  if (!cleanFullName || cleanFullName.length < 2) {
    throw new Error('Please enter your full legal name as it appears on your ID document.');
  }

  const planName = plan === 'vip' ? 'VIP Gold Crown' : 'Pro Blue Tick';
  const priceAmount = plan === 'vip' ? '₹499 / month' : '₹199 / month';

  // Check for an existing pending request
  try {
    const q = query(
      collection(db, 'verificationRequests'),
      where('userId', '==', currentUser.id),
      where('status', '==', 'pending')
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      throw new Error('You already have a pending verification request under review. Please wait for the admin decision.');
    }
  } catch (err: any) {
    // If it's the pending duplicate error, rethrow it
    if (err.message?.includes('already have a pending verification request')) {
      throw err;
    }
    // Otherwise continue
  }

  const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const requestDocRef = doc(db, 'verificationRequests', requestId);

  const requestData: Omit<VerificationRequest, 'id'> = {
    userId: currentUser.id,
    username: currentUser.username,
    displayName: currentUser.displayName,
    userPhotoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.id}`,
    plan,
    planName,
    priceAmount,
    fullName: cleanFullName,
    idDocumentType,
    idDocumentNumber: idDocumentNumber.trim(),
    idDocumentPhotoUrl,
    category,
    paymentMethod,
    paymentTransactionId: cleanTxId,
    paymentScreenshotUrl,
    autoRenew,
    autoPayMethod,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(requestDocRef, requestData);

    // Send in-app confirmation notification to the applicant
    await createInAppNotification({
      userId: currentUser.id,
      type: 'system',
      title: 'Blue Tick Application Submitted',
      body: `Your payment reference (${cleanTxId}) and verification details for ${planName} are received and under administrative review.`,
      data: { requestId, plan },
    });

    return requestId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'verificationRequests');
    throw error;
  }
}

/**
 * Subscribe to the current user's latest verification request
 */
export function subscribeToUserLatestVerificationRequest(
  userId: string,
  callback: (request: VerificationRequest | null) => void
): () => void {
  const q = query(
    collection(db, 'verificationRequests'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(1)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        callback(null);
        return;
      }
      const docData = snapshot.docs[0];
      callback({
        id: docData.id,
        ...docData.data(),
      } as VerificationRequest);
    },
    (err) => {
      console.warn('Error subscribing to user verification request:', err);
      callback(null);
    }
  );
}

/**
 * Subscribe to all verification requests for Admin dashboard review
 */
export function subscribeToAllVerificationRequests(
  callback: (requests: VerificationRequest[]) => void
): () => void {
  const q = query(
    collection(db, 'verificationRequests'),
    orderBy('createdAt', 'desc'),
    limit(150)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: VerificationRequest[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as VerificationRequest[];
      callback(items);
    },
    (err) => {
      console.error('Error fetching verification requests for admin:', err);
      callback([]);
    }
  );
}

/**
 * Admin Action: Approve Paid Verification Request & Grant Blue Tick
 */
export async function approveVerificationRequest(
  adminId: string,
  request: VerificationRequest
): Promise<void> {
  const reqRef = doc(db, 'verificationRequests', request.id);
  const userRef = doc(db, 'users', request.userId);

  const tier = request.plan === 'vip' ? 'vip' : 'pro';

  try {
    // 1. Mark request as approved
    await updateDoc(reqRef, {
      status: 'approved' as VerificationRequestStatus,
      reviewedBy: adminId,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 2. Grant Blue Tick / VIP status on the User record
    const renewalDate = new Date();
    renewalDate.setMonth(renewalDate.getMonth() + 1);

    await updateDoc(userRef, {
      isVerified: true,
      isPremium: true,
      premiumTier: tier,
      verifiedAt: serverTimestamp(),
      subscriptionAutoRenew: request.autoRenew ?? true,
      subscriptionAutoPayMethod: request.autoPayMethod ?? 'upi_autopay',
      subscriptionRenewalDate: renewalDate.toISOString(),
      updatedAt: serverTimestamp(),
    });

    // 3. Log into audit logs
    await addDoc(collection(db, 'auditLogs'), {
      actorId: adminId,
      action: 'PAID_VERIFICATION_REQUEST_APPROVED',
      targetId: request.userId,
      details: {
        requestId: request.id,
        plan: request.plan,
        paymentTransactionId: request.paymentTransactionId,
        paymentMethod: request.paymentMethod,
        priceAmount: request.priceAmount,
      },
      createdAt: serverTimestamp(),
    });

    // 4. Send official celebratory notification to the user
    await createInAppNotification({
      userId: request.userId,
      type: 'system',
      title: '🎉 Blue Tick Verification Approved!',
      body: `Congratulations! Your payment for ${request.planName} has been verified. The official verified badge is now active on your NEXXO profile.`,
      data: { plan: request.plan, requestId: request.id },
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `verificationRequests/${request.id}`);
    throw error;
  }
}

/**
 * Admin Action: Reject Paid Verification Request (with reason)
 */
export async function rejectVerificationRequest(
  adminId: string,
  request: VerificationRequest,
  reason: string
): Promise<void> {
  const reqRef = doc(db, 'verificationRequests', request.id);
  const cleanReason = reason.trim() || 'Payment transaction ID or identity document could not be verified.';

  try {
    await updateDoc(reqRef, {
      status: 'rejected' as VerificationRequestStatus,
      rejectionReason: cleanReason,
      reviewedBy: adminId,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Log into audit logs
    await addDoc(collection(db, 'auditLogs'), {
      actorId: adminId,
      action: 'PAID_VERIFICATION_REQUEST_REJECTED',
      targetId: request.userId,
      details: {
        requestId: request.id,
        reason: cleanReason,
        paymentTransactionId: request.paymentTransactionId,
      },
      createdAt: serverTimestamp(),
    });

    // Send in-app notification with explanation
    await createInAppNotification({
      userId: request.userId,
      type: 'system',
      title: 'Verification Request Update',
      body: `Your application for ${request.planName} could not be approved. Reason: ${cleanReason}. You may re-apply with corrected payment/ID proof.`,
      data: { requestId: request.id, status: 'rejected' },
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `verificationRequests/${request.id}`);
    throw error;
  }
}
