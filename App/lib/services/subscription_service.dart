import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/subscription_info.dart';
import './cache_service.dart';

class SubscriptionService {
  static final SubscriptionService _instance = SubscriptionService._internal();
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final CacheService _cacheService = CacheService();

  factory SubscriptionService() {
    return _instance;
  }

  SubscriptionService._internal();

  Future<SubscriptionInfo> getSubscriptionInfo(String userId) async {
    try {
      // Try cache first
      final cached = await _cacheService.getCachedSubscription(userId);
      if (cached != null && cached.isActive) {
        return cached;
      }

      // If no cache or expired, fetch from Firestore
      final doc = await _firestore
          .collection('paid_subscriptions')
          .doc(userId)
          .get();

      final subscriptionInfo = SubscriptionInfo.fromFirestore(doc.data());
      
      // Update cache
      await _cacheService.cacheSubscriptionInfo(userId, subscriptionInfo);
      
      return subscriptionInfo;
    } catch (e) {
      print('Error getting subscription info: $e');
      return SubscriptionInfo(status: 'free');
    }
  }

  Stream<SubscriptionInfo> streamSubscriptionInfo(String userId) {
    return _firestore
        .collection('paid_subscriptions')
        .doc(userId)
        .snapshots()
        .map((doc) {
          final info = SubscriptionInfo.fromFirestore(doc.data());
          // Update cache whenever we get new data
          _cacheService.cacheSubscriptionInfo(userId, info);
          return info;
        });
  }

  Future<void> refreshProStatus() async {
    // Add any refresh logic if needed
  }
} 