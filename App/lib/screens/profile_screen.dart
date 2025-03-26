import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../auth.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/subscription_info.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'dart:async';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({Key? key}) : super(key: key);

  @override
  _ProfileScreenState createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final User? user = Auth().currentUser;
  SubscriptionInfo? _subscriptionInfo;
  bool _isLoadingSubscription = true;
  static const String _cacheKey = 'subscription_info_cache';
  StreamSubscription? _subscriptionStream;

  @override
  void initState() {
    super.initState();
    _loadSubscriptionInfo();
  }

  @override
  void dispose() {
    _subscriptionStream?.cancel();
    super.dispose();
  }

  Future<void> _loadSubscriptionInfo() async {
    if (user == null) {
      setState(() {
        _isLoadingSubscription = false;
        _subscriptionInfo = SubscriptionInfo(status: 'free');
      });
      return;
    }

    // Try to load from cache first
    await _loadFromCache();

    try {
      // Set up real-time listener
      _subscriptionStream = FirebaseFirestore.instance
          .collection('paid_subscriptions')
          .doc(user!.uid)
          .snapshots()
          .listen((snapshot) {
        if (mounted) {
          final newSubscriptionInfo = SubscriptionInfo.fromFirestore(snapshot.data());
          _updateSubscriptionInfo(newSubscriptionInfo);
        }
      }, onError: (e) {
        print('Error loading subscription info: $e');
        if (mounted) {
          setState(() {
            _isLoadingSubscription = false;
            _subscriptionInfo = SubscriptionInfo(status: 'free');
          });
        }
      });
    } catch (e) {
      print('Error setting up subscription listener: $e');
      if (mounted) {
        setState(() {
          _isLoadingSubscription = false;
          _subscriptionInfo = SubscriptionInfo(status: 'free');
        });
      }
    }
  }

  Future<void> _loadFromCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedData = prefs.getString(_cacheKey);
      
      if (cachedData != null) {
        final jsonData = json.decode(cachedData);
        setState(() {
          _subscriptionInfo = SubscriptionInfo.fromJson(jsonData);
          _isLoadingSubscription = false;
        });
      }
    } catch (e) {
      print('Error loading from cache: $e');
    }
  }

  Future<void> _updateSubscriptionInfo(SubscriptionInfo newInfo) async {
    setState(() {
      _subscriptionInfo = newInfo;
      _isLoadingSubscription = false;
    });

    // Update cache
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_cacheKey, json.encode(newInfo.toJson()));
    } catch (e) {
      print('Error updating cache: $e');
    }
  }

  Future<void> signOut() async {
    await Auth().signOut();
  }

  Widget _userInfo(User? user) {
    return Column(
      children: [
        Container(
          width: 120,
          height: 120,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: Colors.blue, width: 2),
          ),
          child: ClipOval(
            child: user?.photoURL != null
                ? Image.network(
                    user!.photoURL!,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => Icon(
                      Icons.person,
                      size: 60,
                      color: Colors.blue,
                    ),
                  )
                : Icon(
                    Icons.person,
                    size: 60,
                    color: Colors.blue,
                  ),
          ),
        ),
        SizedBox(height: 20),
        Text(
          user?.displayName ?? 'User',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        SizedBox(height: 8),
        Text(
          user?.email ?? '',
          style: TextStyle(
            fontSize: 16,
            color: Colors.blue[200],
          ),
        ),
      ],
    );
  }

  Widget _buildSubscriptionInfo() {
    if (_isLoadingSubscription) {
      return Container(
        margin: EdgeInsets.symmetric(vertical: 20),
        padding: EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.grey[900],
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: Colors.blue.withOpacity(0.3),
            width: 2,
          ),
        ),
        child: Center(
          child: Column(
            children: [
              SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.blue),
                ),
              ),
              SizedBox(height: 8),
              Text(
                'Loading subscription info...',
                style: TextStyle(
                  color: Colors.grey[400],
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      );
    }

    final info = _subscriptionInfo;
    final Color statusColor = info?.isActive == true ? Colors.green : Colors.blue;
    
    return Container(
      margin: EdgeInsets.symmetric(vertical: 20),
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[900],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: statusColor.withOpacity(0.3),
          width: 2,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Subscription Status',
                style: TextStyle(
                  color: Colors.grey[400],
                  fontSize: 14,
                ),
              ),
              Container(
                padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  info?.displayName ?? 'Free Plan',
                  style: TextStyle(
                    color: statusColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          if (info?.validUntil != null) ...[
            SizedBox(height: 12),
            Text(
              'Valid Until',
              style: TextStyle(
                color: Colors.grey[400],
                fontSize: 14,
              ),
            ),
            SizedBox(height: 4),
            Text(
              '${info!.validUntil!.toLocal().toString().split(' ')[0]}',
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _profileOption({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    bool isDestructive = false,
  }) {
    return Container(
      margin: EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.grey[900],
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        leading: Icon(
          icon,
          color: isDestructive ? Colors.red[300] : Colors.blue[200],
        ),
        title: Text(
          title,
          style: TextStyle(
            color: isDestructive ? Colors.red[300] : Colors.white,
            fontSize: 16,
          ),
        ),
        trailing: Icon(
          Icons.chevron_right,
          color: Colors.grey[600],
        ),
        onTap: onTap,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        extendBody: true,
        resizeToAvoidBottomInset: false,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          title: Text(
            'Profile',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        body: SafeArea(
          bottom: false,
          child: SingleChildScrollView(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Column(
                children: [
                  _userInfo(user),
                  _buildSubscriptionInfo(),
                  SizedBox(height: 40),
                  _profileOption(
                    icon: Icons.person_outline,
                    title: 'Edit Profile',
                    onTap: () {
                      // Add edit profile functionality
                    },
                  ),
                  _profileOption(
                    icon: Icons.settings_outlined,
                    title: 'Settings',
                    onTap: () {
                      // Add settings functionality
                    },
                  ),
                  _profileOption(
                    icon: Icons.help_outline,
                    title: 'Help & Support',
                    onTap: () {
                      // Add help functionality
                    },
                  ),
                  _profileOption(
                    icon: Icons.privacy_tip_outlined,
                    title: 'Privacy Policy',
                    onTap: () {
                      // Add privacy policy functionality
                    },
                  ),
                  SizedBox(height: 20),
                  _profileOption(
                    icon: Icons.logout,
                    title: 'Sign Out',
                    onTap: signOut,
                    isDestructive: true,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
} 