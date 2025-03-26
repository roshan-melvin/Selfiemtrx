import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export function handleRazorpayPayment(userId: string) {
  const options = {
    key: 'rzp_live_XbVRnitf24iTYy', // your Razorpay key
    amount: 100, // ₹10 in paise
    currency: 'INR',
    name: 'Selfiemtrx Pro',
    description: 'Monthly Pro Subscription',
    handler: async function(response: any) {
      if (response.razorpay_payment_id) {
        // Only if payment is successful, update user to pro
        const now = new Date();
        const validUntil = new Date(now);
        validUntil.setMonth(now.getMonth() + 1); // Add 1 month

        // Update subscription in Firestore
        await setDoc(doc(db, 'subscriptions', userId), {
          createdAt: Timestamp.now(),
          status: 'monthly_pro',
          validUntil: Timestamp.fromDate(validUntil)
        });
      }
    },
    prefill: {
      name: 'User',
      email: 'user@example.com'
    },
    theme: {
      color: '#6a5acd'
    }
  };

  const rzp = new (window as any).Razorpay(options);
  rzp.open();
}
