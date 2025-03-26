import 'package:cloud_firestore/cloud_firestore.dart';

class SubscriptionInfo {
  final String status;
  final DateTime? validUntil;
  final DateTime? createdAt;
  final String? paymentId;
  final int? amount;

  SubscriptionInfo({
    required this.status,
    this.validUntil,
    this.createdAt,
    this.paymentId,
    this.amount,
  });

  Map<String, dynamic> toJson() {
    return {
      'status': status,
      'validUntil': validUntil?.toIso8601String(),
      'createdAt': createdAt?.toIso8601String(),
      'paymentId': paymentId,
      'amount': amount,
    };
  }

  factory SubscriptionInfo.fromFirestore(Map<String, dynamic>? data) {
    if (data == null) {
      return SubscriptionInfo(status: 'free');
    }

    return SubscriptionInfo(
      status: data['status'] ?? 'free',
      validUntil: data['validUntil'] != null 
          ? (data['validUntil'] as Timestamp).toDate()
          : null,
      createdAt: data['createdAt'] is Timestamp 
          ? data['createdAt'].toDate() 
          : data['createdAt'] != null 
              ? DateTime.parse(data['createdAt']) 
              : null,
      paymentId: data['paymentId'],
      amount: data['amount'],
    );
  }

  factory SubscriptionInfo.fromJson(Map<String, dynamic> json) {
    return SubscriptionInfo(
      status: json['status'] ?? 'free',
      validUntil: json['validUntil'] != null 
          ? DateTime.parse(json['validUntil']) 
          : null,
      createdAt: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt']) 
          : null,
      paymentId: json['paymentId'],
      amount: json['amount'],
    );
  }

  bool get isActive {
    if (status == 'free') return false;
    if (validUntil == null) return false;
    return validUntil!.isAfter(DateTime.now());
  }

  String get displayName {
    switch (status) {
      case 'monthly_pro':
        return 'Premium Monthly';
      case 'yearly_pro':
        return 'Premium Yearly';
      default:
        return 'Free Plan';
    }
  }
} 