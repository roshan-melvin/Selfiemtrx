import { collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface UserStats {
  lastAnalysis: string | null;
  remainingCredits: number;
  subscriptionStatus: string;
  totalAnalyses: number;
  uid: string;
}

export async function getUserStats(userId: string): Promise<UserStats | null> {
  try {
    // Query the collection to find the document with matching uid
    const userStatsRef = collection(db, 'user_stats');
    const q = query(userStatsRef, where('uid', '==', userId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('Creating new stats for user:', userId);
      // Create new stats if none exist
      const newStats: UserStats = {
        lastAnalysis: null,
        remainingCredits: 10,
        subscriptionStatus: 'free',
        totalAnalyses: 0,
        uid: userId
      };
      
      try {
        // Add new document with auto-generated ID
        const docRef = doc(userStatsRef);
        await setDoc(docRef, newStats);
        console.log('Successfully created new stats');
        return newStats;
      } catch (error) {
        console.error('Error creating new stats:', error);
        throw error;
      }
    }

    console.log('Found existing stats');
    return querySnapshot.docs[0].data() as UserStats;
  } catch (error) {
    console.error('Error in getUserStats:', error);
    throw error;
  }
}

export async function updateUserStats(userId: string): Promise<UserStats> {
  const userStatsRef = collection(db, 'user_stats');
  const q = query(userStatsRef, where('uid', '==', userId));
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    const docRef = querySnapshot.docs[0].ref;
    const currentStats = querySnapshot.docs[0].data() as UserStats;
    
    const updatedStats: Partial<UserStats> = {
      lastAnalysis: new Date().toISOString(),
      totalAnalyses: currentStats.totalAnalyses + 1,
    };

    // Only decrement credits for free users
    if (currentStats.subscriptionStatus === 'free') {
      updatedStats.remainingCredits = Math.max(0, currentStats.remainingCredits - 1);
    }

    await updateDoc(docRef, updatedStats);
    return { ...currentStats, ...updatedStats };
  }

  throw new Error('User stats not found');
}

export function formatLastAnalysis(lastAnalysis: string | null): string {
  if (!lastAnalysis) return 'Never';
  
  const analysisDate = new Date(lastAnalysis);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - analysisDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
} 