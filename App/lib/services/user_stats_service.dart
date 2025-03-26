import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:rxdart/rxdart.dart';
import './cache_service.dart'; // Assuming you have a CacheService for caching
import '../models/user_stats.dart';
import '../models/subscription_info.dart';
import '../auth.dart';

class UserStatsService {
  static final UserStatsService _instance = UserStatsService._internal();
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final CacheService _cacheService = CacheService();

  factory UserStatsService() {
    return _instance;
  }

  UserStatsService._internal();

  Future<UserStats> getUserStats(String userId) async {
    try {
      // Try cache first
      final cached = await _cacheService.getCachedUserStats(userId);
      if (cached != null) {
        return cached;
      }

      // If no cache, fetch from Firestore
      final doc = await _firestore
          .collection('user_stats')
          .doc(userId)
          .get();

      final userStats = UserStats.fromFirestore(doc.data(), userId);
      
      // Update cache
      await _cacheService.cacheUserStats(userId, userStats);
      
      return userStats;
    } catch (e) {
      print('Error getting user stats: $e');
      return UserStats(
        uid: userId,
        totalAnalyses: 0,
        remainingCredits: 10,
        lastAnalysis: null,
        subscriptionStatus: 'free',
      );
    }
  }

  Stream<UserStats> streamUserStats(String userId) {
    final userStatsStream = _firestore.collection('user_stats').doc(userId).snapshots();
    final subscriptionStream = _firestore.collection('paid_subscriptions').doc(userId).snapshots();

    return Rx.combineLatest2(
      userStatsStream, 
      subscriptionStream, 
      (DocumentSnapshot userStatsDoc, DocumentSnapshot subscriptionDoc) {
        // Get subscription status
        final subscriptionInfo = SubscriptionInfo.fromFirestore(subscriptionDoc.data() as Map<String, dynamic>?);
        
        if (!userStatsDoc.exists) {
          return UserStats(
            uid: userId,
            totalAnalyses: 0,
            remainingCredits: 10,
            lastAnalysis: null,
            subscriptionStatus: 'free',
          );
        }

        // Get the data with proper type casting
        final data = userStatsDoc.data() as Map<String, dynamic>?;
        
        // Create stats with actual values from Firestore
        final stats = UserStats(
          uid: userId,
          totalAnalyses: data?['totalAnalyses'] ?? 0,
          remainingCredits: data?['remainingCredits'] ?? 10,
          lastAnalysis: data?['lastAnalysis'] != null 
              ? (data!['lastAnalysis'] is Timestamp 
                  ? (data['lastAnalysis'] as Timestamp).toDate()
                  : DateTime.parse(data['lastAnalysis'].toString()))
              : null,
          subscriptionStatus: subscriptionInfo.status,
        );

        print('Fetched stats for user $userId: ${data.toString()}'); // Debug log
        return stats;
    });
  }

  Future<UserStats> updateAfterAnalysis(String userId) async {
    try {
      final docRef = _firestore.collection('user_stats').doc(userId);
      final subscriptionRef = _firestore.collection('paid_subscriptions').doc(userId);
      
      return await _firestore.runTransaction<UserStats>((transaction) async {
        final docSnap = await transaction.get(docRef);
        final subscriptionSnap = await transaction.get(subscriptionRef);
        
        final subscriptionInfo = SubscriptionInfo.fromFirestore(subscriptionSnap.data());
        final isPro = subscriptionInfo.status == 'monthly_pro' || 
                     subscriptionInfo.status == 'yearly_pro';
        
        if (!docSnap.exists) {
          final newStats = UserStats(
            uid: userId,
            totalAnalyses: 1,
            remainingCredits: isPro ? double.infinity.toInt() : 9,
            lastAnalysis: DateTime.now(),
            subscriptionStatus: subscriptionInfo.status,
          );
          
          await docRef.set(newStats.toJson());
          return newStats;
        } 
        
        // Get current data
        final data = docSnap.data()!;
        final currentAnalyses = (data['totalAnalyses'] ?? 0) as int;
        final currentCredits = (data['remainingCredits'] ?? 10) as int;
        
        final updatedStats = UserStats(
          uid: userId,
          totalAnalyses: currentAnalyses + 1,
          remainingCredits: isPro ? currentCredits : (currentCredits > 0 ? currentCredits - 1 : 0),
          lastAnalysis: DateTime.now(),
          subscriptionStatus: subscriptionInfo.status,
        );
        
        await docRef.update(updatedStats.toJson());
        return updatedStats;
      });
    } catch (e) {
      print('Error updating stats for user $userId: $e');
      throw e;
    }
  }

  Future<void> initializeUserStats(String userId) async {
    try {
      final docRef = _firestore.collection('user_stats').doc(userId);
      final doc = await docRef.get();
      
      if (!doc.exists) {
        await docRef.set({
          'uid': userId,
          'totalAnalyses': 0,
          'remainingCredits': 10,
          'lastAnalysis': null,
          'subscriptionStatus': 'free',
        });
        print('Initialized stats for user $userId');
      }
    } catch (e) {
      print('Error initializing stats for user $userId: $e');
      throw e;
    }
  }

  // Add method to get current user stats
  Future<UserStats?> getCurrentUserStats() async {
    final user = Auth().currentUser;
    if (user == null) return null;

    try {
      final doc = await _firestore
          .collection('user_stats')
          .doc(user.uid)
          .get();

      if (!doc.exists) {
        await initializeUserStats(user.uid);
        return UserStats(
          uid: user.uid,
          totalAnalyses: 0,
          remainingCredits: 10,
          lastAnalysis: null,
          subscriptionStatus: 'free',
        );
      }

      return UserStats.fromFirestore(doc.data(), user.uid);
    } catch (e) {
      print('Error getting current user stats: $e');
      return null;
    }
  }
}