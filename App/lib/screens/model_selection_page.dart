import 'package:flutter/material.dart';
import 'camera_screen.dart' as free;
import 'upload_screen.dart' as free;
import 'pro/camera_pro_screen.dart' as pro;
import 'pro/upload_pro_screen.dart' as pro;
import '../services/subscription_service.dart';
import '../models/subscription_info.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../auth.dart';
import '../services/user_stats_service.dart';
import '../models/analysis_model.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../utils/page_transitions.dart';

class ModelSelectionPage extends StatefulWidget {
  final bool isCamera;

  const ModelSelectionPage({
    Key? key,
    required this.isCamera,
  }) : super(key: key);

  @override
  _ModelSelectionPageState createState() => _ModelSelectionPageState();
}

class _ModelSelectionPageState extends State<ModelSelectionPage> {
  final SubscriptionService _subscriptionService = SubscriptionService();

  @override
  Widget build(BuildContext context) {
    final user = Auth().currentUser;

    return Theme(
      data: Theme.of(context).copyWith(
        scaffoldBackgroundColor: Colors.transparent,
      ),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
            icon: Icon(Icons.arrow_back, color: Colors.white),
            onPressed: () => Navigator.pop(context),
          ),
          title: Text(
            'Select Analysis Model',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        body: StreamBuilder<SubscriptionInfo>(
          stream: user != null 
              ? _subscriptionService.streamSubscriptionInfo(user.uid)
              : Stream.value(SubscriptionInfo(status: 'free')),
          initialData: SubscriptionInfo(status: 'free'),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return Center(child: CircularProgressIndicator());
            }

            final subscriptionInfo = snapshot.data!;
            final isPro = subscriptionInfo.status == 'monthly_pro' || 
                         subscriptionInfo.status == 'yearly_pro';

            return Container(
              padding: EdgeInsets.symmetric(horizontal: 16, vertical: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildModelOption(
                    context,
                    title: 'Free Model',
                    description: 'Basic analysis with standard features',
                    icon: Icons.analytics_outlined,
                    gradient: [Colors.blue[400]!, Colors.blue[600]!],
                    onTap: () {
                      if (widget.isCamera) {
                        Navigator.push(
                          context,
                          SmoothPageRoute(
                            child: free.CameraScreen(
                              selectedModel: AnalysisModel.free,
                            ),
                          ),
                        );
                      } else {
                        Navigator.push(
                          context,
                          SmoothPageRoute(
                            child: free.UploadScreen(
                              selectedModel: AnalysisModel.free,
                            ),
                          ),
                        );
                      }
                    },
                    features: [
                      'Basic height estimation',
                      'Standard weight analysis',
                      'Simple age detection',
                    ],
                  ),
                  SizedBox(height: 20),
                  _buildModelOption(
                    context,
                    title: 'Pro Model',
                    description: 'Advanced analysis with premium features',
                    icon: Icons.star,
                    gradient: [Colors.purple[400]!, Colors.purple[600]!],
                    isLocked: !isPro,
                    onTap: () {
                      if (!isPro) {
                        showDialog(
                          context: context,
                          barrierDismissible: true,
                          builder: (context) => TweenAnimationBuilder<double>(
                            duration: Duration(milliseconds: 300),
                            curve: Curves.easeOut,
                            tween: Tween(begin: 0.0, end: 1.0),
                            builder: (context, value, child) {
                              return Transform.scale(
                                scale: value,
                                child: AlertDialog(
                                  backgroundColor: Colors.grey[900],
                                  title: Text(
                                    'Pro Feature',
                                    style: TextStyle(color: Colors.white),
                                  ),
                                  content: Text(
                                    'This feature is only available for Pro users. Would you like to upgrade?',
                                    style: TextStyle(color: Colors.grey[300]),
                                  ),
                                  actions: [
                                    TextButton(
                                      child: Text('Cancel'),
                                      onPressed: () => Navigator.pop(context),
                                    ),
                                    TextButton(
                                      child: Text('Upgrade'),
                                      onPressed: () {
                                        Navigator.pop(context);
                                        Navigator.pushNamed(context, '/upgrade');
                                      },
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                        );
                      } else {
                        if (widget.isCamera) {
                          Navigator.push(
                            context,
                            SmoothPageRoute(
                              child: pro.CameraProScreen(
                                selectedModel: AnalysisModel.pro,
                              ),
                            ),
                          );
                        } else {
                          Navigator.push(
                            context,
                            SmoothPageRoute(
                              child: pro.UploadProScreen(
                                selectedModel: AnalysisModel.pro,
                              ),
                            ),
                          );
                        }
                      }
                    },
                    features: [
                      'Advanced height estimation',
                      'Precise weight analysis',
                      'Detailed age detection',
                      'Premium features access',
                    ],
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildModelOption(
    BuildContext context, {
    required String title,
    required String description,
    required IconData icon,
    required List<Color> gradient,
    required VoidCallback onTap,
    required List<String> features,
    bool isLocked = false,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          width: double.infinity,
          padding: EdgeInsets.all(24),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            color: Colors.grey[900],
            border: Border.all(
              color: gradient[0].withOpacity(0.5),
              width: 2,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: gradient,
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(icon, color: Colors.white, size: 24),
                  ),
                  SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              title,
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            if (isLocked) ...[
                              SizedBox(width: 8),
                              Icon(
                                Icons.lock,
                                color: Colors.grey[400],
                                size: 16,
                              ),
                            ],
                          ],
                        ),
                        SizedBox(height: 4),
                        Text(
                          description,
                          style: TextStyle(
                            color: Colors.grey[400],
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              SizedBox(height: 16),
              ...features.map((feature) => Padding(
                padding: EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    Icon(
                      Icons.check_circle_outline,
                      color: gradient[0],
                      size: 20,
                    ),
                    SizedBox(width: 8),
                    Text(
                      feature,
                      style: TextStyle(
                        color: Colors.grey[300],
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              )).toList(),
            ],
          ),
        ),
      ),
    );
  }
} 