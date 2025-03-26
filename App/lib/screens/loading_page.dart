import 'package:flutter/material.dart';
import 'dart:async';
import '../services/api_service.dart';
import '../screens/results_screen.dart';

class LoadingPage extends StatefulWidget {
  final Stream<ProcessingStatus> statusStream;
  final ApiService apiService;
  final String? customLoadingText;

  const LoadingPage({
    Key? key,
    required this.statusStream,
    required this.apiService,
    this.customLoadingText,
  }) : super(key: key);

  @override
  State<LoadingPage> createState() => _LoadingPageState();
}

class _LoadingPageState extends State<LoadingPage> with SingleTickerProviderStateMixin {
  StreamSubscription? _subscription;
  bool _navigating = false;
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _setupAnimations();
    _setupStatusListener();
  }

  void _setupAnimations() {
    _animationController = AnimationController(
      vsync: this,
      duration: Duration(seconds: 2),
    );

    _fadeAnimation = Tween<double>(
      begin: 0.3,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    ));

    _animationController.repeat(reverse: true);
  }

  void _setupStatusListener() {
    _subscription = widget.statusStream.listen(
      (status) {
        if (_navigating) return;

        switch (status) {
          case ProcessingStatus.completed:
            _navigating = true;
            final results = widget.apiService.getLastResults();
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                builder: (context) => ResultsScreen(results: results),
              ),
            );
            break;
          case ProcessingStatus.error:
            _navigating = true;
            Navigator.of(context).pop();
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Analysis failed. Please try again.')),
            );
            break;
          default:
            break;
        }
      },
      onError: (error) {
        if (!_navigating) {
          _navigating = true;
          Navigator.of(context).pop();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('An error occurred. Please try again.')),
          );
        }
      },
    );
  }

  @override
  void dispose() {
    _subscription?.cancel();
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvoked: (didPop) async {
        if (didPop) return;
        
        final shouldPop = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            backgroundColor: Colors.grey[900],
            title: Text(
              'Cancel Analysis?',
              style: TextStyle(color: Colors.white),
            ),
            content: Text(
              'Are you sure you want to cancel the image analysis?',
              style: TextStyle(color: Colors.grey[300]),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: Text(
                  'Continue Analysis',
                  style: TextStyle(color: Colors.blue[300]),
                ),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, true),
                child: Text(
                  'Cancel Analysis',
                  style: TextStyle(color: Colors.red[300]),
                ),
              ),
            ],
          ),
        );

        if (shouldPop == true) {
          widget.apiService.cancelOperation();
          _navigating = true;
          Navigator.of(context).pop();
        }
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        body: SafeArea(
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black,
                  Colors.grey[900]!,
                  Colors.black,
                ],
              ),
            ),
            child: Center(
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Animated Icon
                    AnimatedBuilder(
                      animation: _fadeAnimation,
                      builder: (context, child) {
                        return Opacity(
                          opacity: _fadeAnimation.value,
                          child: Icon(
                            Icons.analytics_outlined,
                            size: 80,
                            color: Colors.blue[300],
                          ),
                        );
                      },
                    ),
                    SizedBox(height: 40),
                    
                    // Progress Indicator
                    Container(
                      width: 200,
                      height: 4,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(2),
                      ),
                      child: LinearProgressIndicator(
                        backgroundColor: Colors.grey[800],
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.blue[300]!),
                      ),
                    ),
                    SizedBox(height: 32),
                    
                    // Title
                    Text(
                      widget.customLoadingText ?? 'Analyzing Image',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 16),
                    
                    // Description
                    Text(
                      'Please wait while we process your image.\nThis may take up to 30 seconds.',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.grey[400],
                        height: 1.5,
                      ),
                    ),
                    
                    // Processing Steps
                    SizedBox(height: 40),
                    _buildProcessingStep(
                      icon: Icons.face_outlined,
                      text: 'Detecting facial features',
                      isActive: true,
                    ),
                    _buildProcessingStep(
                      icon: Icons.height,
                      text: 'Calculating measurements',
                      isActive: true,
                    ),
                    _buildProcessingStep(
                      icon: Icons.analytics_outlined,
                      text: 'Analyzing results',
                      isActive: true,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildProcessingStep({
    required IconData icon,
    required String text,
    required bool isActive,
  }) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(
            icon,
            size: 24,
            color: isActive ? Colors.blue[300] : Colors.grey[600],
          ),
          SizedBox(width: 16),
          Text(
            text,
            style: TextStyle(
              color: isActive ? Colors.grey[300] : Colors.grey[600],
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }
} 