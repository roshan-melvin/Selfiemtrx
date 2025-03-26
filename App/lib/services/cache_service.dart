import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../models/subscription_info.dart';
import '../models/user_stats.dart';

class CacheService {
  static final CacheService _instance = CacheService._internal();
  static const String SUBSCRIPTION_CACHE_KEY = 'subscription_cache';
  static const String USER_STATS_CACHE_KEY = 'user_stats_cache';
  
  factory CacheService() {
    return _instance;
  }

  CacheService._internal();

  Future<void> cacheSubscriptionInfo(String userId, SubscriptionInfo info) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('$SUBSCRIPTION_CACHE_KEY:$userId', jsonEncode(info.toJson()));
  }

  Future<SubscriptionInfo?> getCachedSubscription(String userId) async {
    final prefs = await SharedPreferences.getInstance();
    final cached = prefs.getString('$SUBSCRIPTION_CACHE_KEY:$userId');
    if (cached != null) {
      return SubscriptionInfo.fromFirestore(jsonDecode(cached));
    }
    return null;
  }

  Future<void> cacheUserStats(String userId, UserStats stats) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('$USER_STATS_CACHE_KEY:$userId', jsonEncode(stats.toJson()));
  }

  Future<UserStats?> getCachedUserStats(String userId) async {
    final prefs = await SharedPreferences.getInstance();
    final cached = prefs.getString('$USER_STATS_CACHE_KEY:$userId');
    if (cached != null) {
      return UserStats.fromFirestore(jsonDecode(cached), userId);
    }
    return null;
  }

  Future<void> clearUserCache(String userId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('$SUBSCRIPTION_CACHE_KEY:$userId');
    await prefs.remove('$USER_STATS_CACHE_KEY:$userId');
  }
} 