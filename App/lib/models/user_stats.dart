import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:intl/intl.dart';

class UserStats {
  final String uid;
  final int totalAnalyses;
  final int remainingCredits;
  final DateTime? lastAnalysis;
  final String subscriptionStatus;

  UserStats({
    required this.uid,
    required this.totalAnalyses,
    required this.remainingCredits,
    this.lastAnalysis,
    required this.subscriptionStatus,
  });

  Map<String, dynamic> toJson() {
    return {
      'uid': uid,
      'totalAnalyses': totalAnalyses,
      'remainingCredits': remainingCredits,
      'lastAnalysis': lastAnalysis?.toIso8601String(),
      'subscriptionStatus': subscriptionStatus,
    };
  }

  factory UserStats.fromFirestore(Map<String, dynamic>? data, String userId) {
    if (data == null) {
      return UserStats(
        uid: userId,
        totalAnalyses: 0,
        remainingCredits: 10,
        lastAnalysis: null,
        subscriptionStatus: 'free',
      );
    }

    DateTime? parsedLastAnalysis;
    if (data['lastAnalysis'] != null) {
      try {
        if (data['lastAnalysis'] is String) {
          parsedLastAnalysis = DateTime.parse(data['lastAnalysis']);
        } else if (data['lastAnalysis'] is Timestamp) {
          parsedLastAnalysis = (data['lastAnalysis'] as Timestamp).toDate();
        }
      } catch (e) {
        print('Error parsing lastAnalysis: $e');
      }
    }

    return UserStats(
      uid: userId,
      totalAnalyses: data['totalAnalyses'] ?? 0,
      remainingCredits: data['remainingCredits'] ?? 10,
      lastAnalysis: parsedLastAnalysis,
      subscriptionStatus: data['subscriptionStatus'] ?? 'free',
    );
  }

  String get displayCredits {
    if (subscriptionStatus == 'monthly_pro' || subscriptionStatus == 'yearly_pro') {
      return '∞';
    }
    return '$remainingCredits/10';
  }

  String get formattedLastAnalysis {
    if (lastAnalysis == null) return 'Never';
    return DateFormat('MMM d, yyyy').format(lastAnalysis!);
  }

  bool get hasRemainingCredits =>
    subscriptionStatus != 'free' || remainingCredits > 0;
}