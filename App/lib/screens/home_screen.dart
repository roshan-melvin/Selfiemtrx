import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:camera/camera.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;
import 'package:share_plus/share_plus.dart' as share_plus;
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_downloader/flutter_downloader.dart';
import 'package:path_provider/path_provider.dart';
import 'package:mime/mime.dart';
import 'package:permission_handler/permission_handler.dart';
import '../services/api_service.dart';
import '../utils/helpers.dart';
import '../widgets/feature_card.dart';
import 'chat_screen.dart';
import 'analysis_screen.dart';
import 'analysis_result_screen.dart';
import 'profile_screen.dart';
import '../widgets/bottom_nav_bar.dart';
import '../widgets/camera_view.dart';
import 'camera_screen.dart' as free;
import 'upload_screen.dart' as free;
import 'analysis_result_screen.dart';
import 'bmi_page.dart';
import 'model_selection_page.dart';
import 'pro/camera_pro_screen.dart' as pro;
import 'pro/upload_pro_screen.dart' as pro;
import 'package:flutter/rendering.dart';
import '../models/user_stats.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../auth.dart';
import 'package:intl/intl.dart';
import '../models/subscription_info.dart';
import '../services/user_stats_service.dart';
import '../services/subscription_service.dart';

class HomeScreen extends StatefulWidget {
  final List<CameraDescription> cameras;

  HomeScreen({required this.cameras});

  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  final ApiService _apiService = ApiService();
  bool _initialized = false;
  int _currentIndex = 0;
  bool _isAnalyzeMenuOpen = false;
  late PageController _pageController;
  late TabController _tabController;
  
  // Add missing properties
  late List<Widget> _screens;
  String currentView = 'home';
  String previousView = 'home';
  String? selectedImage;
  String? error;
  bool showLogin = false;
  bool showSignUp = false;
  late AnimationController _loadingController;
  
  // Analysis-related properties
  Map<String, dynamic>? analysisResult;
  List<Map<String, dynamic>> countries = [
    {'code': 'IN', 'name': 'India'},
    {'code': 'US', 'name': 'United States'},
    {'code': 'CA', 'name': 'Canada'},
  ];
  String selectedCountry = 'IN';
  
  bool isDragging = false;
  bool _shouldShowBottomBar = true;
  bool _showBlur = false;

  final UserStatsService _userStatsService = UserStatsService();
  final SubscriptionService _subscriptionService = SubscriptionService();
  StreamSubscription? _statsSubscription;
  UserStats? _userStats;
  bool _isLoadingStats = true;
  int _totalAnalyses = 0;
  int _remainingCredits = 0;
  DateTime? _lastAnalysis;
  bool _isAnalyzing = false;
  final ImagePicker _imagePicker = ImagePicker();

  // Default values
  UserStats get defaultStats => UserStats(
    uid: Auth().currentUser?.uid ?? '',
    totalAnalyses: 0,
    remainingCredits: 10,
    lastAnalysis: null,
    subscriptionStatus: 'free',
  );

  // Getter to always return a UserStats object
  UserStats get stats => _userStats ?? defaultStats;

  @override
  void initState() {
    super.initState();
    _initializeControllers();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initializeScreens();
      _initializeStats();
    });
  }

  void _initializeControllers() {
    _tabController = TabController(length: 4, vsync: this);
    _pageController = PageController(initialPage: 0);
    
    // Initialize loading controller
    _loadingController = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: 1500),
    )..repeat();
  }

  void _initializeScreens() {
    if (!_initialized) {
      setState(() {
        _screens = [
          _buildMainScreen(),
          ChatScreen(),
          AnalysisScreen(),
          ProfileScreen(),
        ];
        _initialized = true;
      });
    }
  }

  @override
  void dispose() {
    _loadingController.dispose();
    _tabController.dispose();
    _pageController.dispose();
    _statsSubscription?.cancel();
    super.dispose();
  }

  Future<void> handleAnalysis(String base64Image) async {
    try {
      setState(() {
        error = null;
      });

      final result = await _apiService.analyzeImage(base64Image, selectedCountry);
      
      setState(() {
        analysisResult = result;
      });

      // Navigate to analysis result screen
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => ResultsScreen(
            results: result,
          ),
        ),
      );
    } catch (e) {
      showErrorMessage('Analysis failed: ${e.toString()}');
    }
  }

  void _openCamera() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ModelSelectionPage(
          isCamera: true,
        ),
      ),
    );
  }

  void _handleUploadAction() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ModelSelectionPage(
          isCamera: false,
        ),
      ),
    );
  }

  void showErrorMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(Icons.error_outline, color: Colors.white),
            SizedBox(width: 12),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: Colors.red[900],
        behavior: SnackBarBehavior.floating,
        margin: EdgeInsets.all(16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        duration: Duration(seconds: 4),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (!_initialized) {
      return Material(
        color: Colors.black,
        child: Center(
          child: CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF60A5FA)),
          ),
        ),
      );
    }

    return PopScope(
      canPop: !_isAnalyzeMenuOpen && currentView == 'home',
      onPopInvoked: (didPop) async {
        if (didPop) return;
        
        if (_isAnalyzeMenuOpen) {
          setState(() {
            _isAnalyzeMenuOpen = false;
          });
          return;
        }
        
        if (currentView != 'home') {
          setState(() {
            currentView = 'home';
            _shouldShowBottomBar = true;
            _tabController.animateTo(0);
            if (_pageController.hasClients) {
              _pageController.jumpToPage(0);
            }
          });
          return;
        }
        
        Navigator.of(context).pop();
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        body: Stack(
          children: [
            // Main Content
            Positioned.fill(
              child: IgnorePointer(
                ignoring: _isAnalyzeMenuOpen,
                child: PageView(
                  controller: _pageController,
                  physics: NeverScrollableScrollPhysics(),
                  onPageChanged: _handlePageChange,
                  children: _screens,
                ),
              ),
            ),

            // Bottom Navigation
            if (_shouldShowBottomBar)
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: Container(
                  height: 80,
                  decoration: BoxDecoration(
                    color: Colors.black,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.3),
                        blurRadius: 8,
                        offset: Offset(0, -2),
                      ),
                    ],
                  ),
                  child: SafeArea(
                    top: false,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        _buildNavButton(icon: Icons.home, label: 'Home', index: 0),
                        _buildNavButton(icon: Icons.chat, label: 'Chat', index: 1),
                        SizedBox(width: 60),
                        _buildNavButton(icon: Icons.analytics, label: 'BMI', index: 2),
                        _buildNavButton(icon: Icons.person, label: 'Profile', index: 3),
                      ],
                    ),
                  ),
                ),
              ),

            // Plus Button and Popup Menu
            if (_shouldShowBottomBar)
              Positioned(
                left: 0,
                right: 0,
                bottom: 40,
                child: Stack(
                  alignment: Alignment.bottomCenter,
                  children: [
                    // Blur overlay when menu is open
                    if (_showBlur)
                      Positioned.fill(
                        child: BackdropFilter(
                          filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
                          child: GestureDetector(
                            onTap: () {
                              setState(() {
                                _isAnalyzeMenuOpen = false;
                                _showBlur = false;
                              });
                            },
                            child: Container(
                              color: Colors.black.withOpacity(0.5),
                            ),
                          ),
                        ),
                      ),

                    // Popup Menu Buttons
                    if (_isAnalyzeMenuOpen)
                      Container(
                        margin: EdgeInsets.only(bottom: 80),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Transform.translate(
                              offset: Offset(-40, -20),
                              child: _buildActionButton(
                                icon: Icons.camera_alt,
                                label: 'Camera',
                                gradient: [Color(0xFF60A5FA), Color(0xFF3B82F6)],
                                onPressed: _openCamera,
                                glowing: false,
                              ),
                            ),
                            Transform.translate(
                              offset: Offset(40, -20),
                              child: _buildActionButton(
                                icon: Icons.upload_file,
                                label: 'Upload',
                                gradient: [Color(0xFFA78BFA), Color(0xFF7C3AED)],
                                onPressed: _handleUploadAction,
                                glowing: false,
                              ),
                            ),
                          ],
                        ),
                      ),

                    // Plus Button
                    GestureDetector(
                      onTap: () {
                        HapticFeedback.mediumImpact();
                        setState(() {
                          _isAnalyzeMenuOpen = !_isAnalyzeMenuOpen;
                          _showBlur = !_showBlur;
                        });
                      },
                      child: Container(
                        width: 65,
                        height: 65,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.black,
                          boxShadow: [
                            BoxShadow(
                              color: Color(0xFF60A5FA).withOpacity(0.5),
                              blurRadius: 12,
                              offset: Offset(0, 4),
                            ),
                          ],
                          border: Border.all(
                            color: Color(0xFF60A5FA),
                            width: 2.5,
                          ),
                        ),
                        child: Material(
                          color: Colors.transparent,
                          child: Center(
                            child: AnimatedRotation(
                              duration: Duration(milliseconds: 300),
                              turns: _isAnalyzeMenuOpen ? 0.125 : 0,
                              child: Icon(
                                Icons.add,
                                color: Color(0xFF60A5FA),
                                size: 35,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  void _handlePageChange(int index) {
    setState(() {
      _tabController.animateTo(index);
      switch (index) {
        case 0:
          currentView = 'home';
          _shouldShowBottomBar = true;
          break;
        case 1:
          currentView = 'chat';
          _shouldShowBottomBar = false;
          // Navigate to chat screen
          WidgetsBinding.instance.addPostFrameCallback((_) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => ChatScreen(),
              ),
            ).then((_) {
              // When returning from chat
              if (mounted) {
                setState(() {
                  currentView = 'home';
                  _shouldShowBottomBar = true;
                  _tabController.animateTo(0);
                  if (_pageController.hasClients) {
                    _pageController.jumpToPage(0);
                  }
                });
              }
            });
          });
          break;
        case 2:
          currentView = 'bmi';
          _shouldShowBottomBar = false;
          // Navigate to BMI screen
          WidgetsBinding.instance.addPostFrameCallback((_) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => BMIPage(),
              ),
            ).then((_) {
              // When returning from BMI
              if (mounted) {
                setState(() {
                  currentView = 'home';
                  _shouldShowBottomBar = true;
                  _tabController.animateTo(0);
                  if (_pageController.hasClients) {
                    _pageController.jumpToPage(0);
                  }
                });
              }
            });
          });
          break;
        case 3:
          currentView = 'profile';
          _shouldShowBottomBar = true;
          break;
      }
    });
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required List<Color> gradient,
    required VoidCallback onPressed,
    bool glowing = false,
  }) {
    final screenSize = MediaQuery.of(context).size;
    final buttonSize = screenSize.width * 0.15;
    final iconSize = buttonSize * 0.4;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: buttonSize,
          height: buttonSize,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              colors: gradient,
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            boxShadow: [
              if (glowing)
                BoxShadow(
                  color: gradient[0].withOpacity(0.6),
                  blurRadius: 20,
                  spreadRadius: 4,
                ),
              BoxShadow(
                color: gradient[0].withOpacity(0.3),
                blurRadius: 8,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              customBorder: CircleBorder(),
              onTap: () {
                HapticFeedback.mediumImpact();
                onPressed();
              },
              child: Center(
                child: Icon(
                  icon,
                  color: Colors.white,
                  size: iconSize,
                ),
              ),
            ),
          ),
        ),
        SizedBox(height: 8),
        Text(
          label,
          style: TextStyle(
            color: Colors.white,
            fontSize: screenSize.width * 0.03,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  void debugPrintButtonState() {
    print("Debug info: isAnalyzeMenuOpen = $_isAnalyzeMenuOpen");
    print("Debug info: currentView = $currentView");
  }

  Widget _buildPopupButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          splashColor: Color(0xFF60A5FA).withOpacity(0.3),
          highlightColor: Color(0xFF60A5FA).withOpacity(0.1),
          child: Container(
            width: MediaQuery.of(context).size.width * 0.65,
            padding: EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.3),
                  spreadRadius: 1,
                  blurRadius: 8,
                  offset: Offset(0, 4),
                ),
                BoxShadow(
                  color: Color(0xFF60A5FA).withOpacity(0.2),
                  spreadRadius: 0,
                  blurRadius: 6,
                  offset: Offset(0, 1),
                ),
              ],
              border: Border.all(
                color: Color(0xFF60A5FA).withOpacity(0.2),
                width: 1.5,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Color(0xFF60A5FA), Color(0xFF3B82F6)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: Color(0xFF3B82F6).withOpacity(0.3),
                        blurRadius: 4,
                        spreadRadius: 0,
                        offset: Offset(0, 2),
                      )
                    ],
                  ),
                  child: Icon(icon, color: Colors.white, size: 20),
                ),
                SizedBox(width: 16),
                Text(
                  label,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.3,
                  ),
                ),
                Spacer(),
                Icon(Icons.arrow_forward_ios, color: Color(0xFF60A5FA), size: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _handleImageLoadError() {
    showErrorMessage('Failed to load image. Please try again.');
    setState(() {
      selectedImage = null;
      error = null;
    });
  }

  void handleAuth(String type) {
    setState(() {
      previousView = currentView;
      if (type == 'login') {
        showLogin = true;
        showSignUp = false;
      } else {
        showSignUp = true;
        showLogin = false;
      }
    });
  }

  Widget buildChatView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.chat_bubble_outline, size: 64, color: Colors.grey[600]),
          SizedBox(height: 16),
          Text(
            'Chat service coming soon',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey[400],
            ),
          ),
        ],
      ),
    );
  }

  Widget buildAnalysisView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.analytics_outlined, size: 64, color: Colors.grey[600]),
          SizedBox(height: 16),
          Text(
            'Analysis Dashboard\nComing Soon',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey[400],
            ),
          ),
        ],
      ),
    );
  }

  Widget buildProfileView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.person_outline, size: 64, color: Colors.grey[600]),
          SizedBox(height: 16),
          Text(
            'Profile service coming soon',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey[400],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCircularButton({
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 60,
        height: 60,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: color,
          boxShadow: [
            BoxShadow(
              color: color.withOpacity(0.5),
              blurRadius: 12,
              offset: Offset(0, 4),
            ),
          ],
        ),
        child: Center(
          child: Icon(
            icon,
            color: Colors.white,
            size: 30,
          ),
        ),
      ),
    );
  }

  Widget _buildFloatingActionButton({
    required IconData icon,
    required String label,
    required List<Color> gradient,
    required VoidCallback onTap,
  }) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              colors: gradient,
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            boxShadow: [
              BoxShadow(
                color: gradient[0].withOpacity(0.3),
                blurRadius: 12,
                spreadRadius: 2,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onTap,
              customBorder: CircleBorder(),
              child: Container(
                padding: EdgeInsets.all(16),
                child: Icon(
                  icon,
                  color: Colors.white,
                  size: 28,
                ),
              ),
            ),
          ),
        ),
        SizedBox(height: 8),
        Text(
          label,
          style: TextStyle(
            color: Colors.white,
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildLoadingOverlay() {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.0, end: 1.0),
      duration: Duration(milliseconds: 300),
      builder: (context, value, child) {
        return Opacity(
          opacity: value,
          child: Container(
            color: Colors.black54,
            child: Center(
              child: Container(
                padding: EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                decoration: BoxDecoration(
                  color: Colors.grey[900],
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black26,
                      blurRadius: 10,
                      spreadRadius: 0,
                      offset: Offset(0, 6),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    RotationTransition(
                      turns: _loadingController,
                      child: CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF60A5FA)),
                        strokeWidth: 3,
                      ),
                    ),
                    SizedBox(height: 16),
                    Text(
                      'Processing...',
                      style: TextStyle(
                        color: Colors.grey[300],
                        fontSize: 16,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildBottomNavBar() {
    return Container(
      height: 80,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          // Bottom Navigation Bar
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              height: 80,
              decoration: BoxDecoration(
                color: Colors.black,
              ),
              child: SafeArea(
                top: false,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _buildNavButton(icon: Icons.home, label: 'Home', index: 0),
                    _buildNavButton(icon: Icons.chat, label: 'Chat', index: 1),
                    SizedBox(width: 60),
                    _buildNavButton(icon: Icons.analytics, label: 'Analysis', index: 2),
                    _buildNavButton(icon: Icons.person, label: 'Profile', index: 3),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavButton({
    required IconData icon,
    required String label,
    required int index,
  }) {
    final isSelected = _tabController.index == index;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        if (_isAnalyzeMenuOpen) {
          setState(() {
            _isAnalyzeMenuOpen = false;
          });
        }

        // Special handling for chat, BMI, and profile tabs
        if (index == 1) { // Chat tab
          setState(() {
            _shouldShowBottomBar = false;
          });
          WidgetsBinding.instance.addPostFrameCallback((_) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => ChatScreen(),
              ),
            ).then((_) {
              if (mounted) {
                setState(() {
                  currentView = 'home';
                  _shouldShowBottomBar = true;
                  _tabController.animateTo(0);
                  if (_pageController.hasClients) {
                    _pageController.jumpToPage(0);
                  }
                });
              }
            });
          });
          return;
        } else if (index == 2) { // BMI tab
          setState(() {
            _shouldShowBottomBar = false;
          });
          WidgetsBinding.instance.addPostFrameCallback((_) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => BMIPage(),
              ),
            ).then((_) {
              if (mounted) {
                setState(() {
                  currentView = 'home';
                  _shouldShowBottomBar = true;
                  _tabController.animateTo(0);
                  if (_pageController.hasClients) {
                    _pageController.jumpToPage(0);
                  }
                });
              }
            });
          });
          return;
        } else if (index == 3) { // Profile tab
          setState(() {
            _shouldShowBottomBar = false;
          });
          WidgetsBinding.instance.addPostFrameCallback((_) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => ProfileScreen(),
              ),
            ).then((_) {
              if (mounted) {
                setState(() {
                  currentView = 'home';
                  _shouldShowBottomBar = true;
                  _tabController.animateTo(0);
                  if (_pageController.hasClients) {
                    _pageController.jumpToPage(0);
                  }
                });
              }
            });
          });
          return;
        }

        // Normal tab handling for other tabs
        setState(() {
          _tabController.animateTo(index);
          if (_pageController.hasClients) {
            _pageController.jumpToPage(index);
          }
          currentView = 'home';
        });
      },
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: isSelected ? Color(0xFF60A5FA) : Colors.grey[600],
              size: 28,
            ),
            SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Color(0xFF60A5FA) : Colors.grey[600],
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMainScreen() {
    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 60),
              // Stats section at the top
              _buildStatsSection(),
              const SizedBox(height: 24),
              // Features section
              Container(
                width: double.infinity,
                padding: EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Features',
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 24),
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 16),
                      child: Column(
                        children: [
                          _buildFeatureCard(
                            'Weight Analysis',
                            'Estimate weight range based on body proportions',
                            Icons.monitor_weight,
                            [Color(0xFFA78BFA), Color(0xFF7C3AED)],
                          ),
                          SizedBox(height: 16),
                          _buildFeatureCard(
                            'Age Detection',
                            'Determine approximate age from facial features',
                            Icons.face,
                            [Color(0xFF34D399), Color(0xFF059669)],
                          ),
                          SizedBox(height: 16),
                          _buildFeatureCard(
                            'Object Measurement',
                            'Measure object dimensions in your photos',
                            Icons.straighten,
                            [Color(0xFFF472B6), Color(0xFFDB2777)],
                          ),
                          // Add some bottom padding for scrolling
                          SizedBox(height: 100),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStatsSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Your Stats',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  title: 'Total Analyses',
                  value: stats.totalAnalyses.toString(),
                  icon: Icons.analytics_outlined,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildStatCard(
                  title: 'Credits',
                  value: stats.displayCredits,
                  icon: Icons.stars_outlined,
                ),
              ),
            ],
          ),
          if (stats.lastAnalysis != null) ...[
            const SizedBox(height: 16),
            _buildStatCard(
              title: 'Last Analysis',
              value: stats.formattedLastAnalysis,
              icon: Icons.access_time,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[900],
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.grey[800]!,
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            icon,
            color: Colors.blue[400],
            size: 24,
          ),
          const SizedBox(height: 12),
          Text(
            title,
            style: TextStyle(
              color: Colors.grey[400],
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFeatureCard(String title, String description, IconData icon, List<Color> gradient) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          HapticFeedback.mediumImpact();
        },
        borderRadius: BorderRadius.circular(20),
        child: Container(
          width: double.infinity,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            gradient: LinearGradient(
              colors: [Colors.black, Colors.grey[900]!],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            border: Border.all(
              color: gradient[0].withOpacity(0.5),
              width: 2,
            ),
            boxShadow: [
              BoxShadow(
                color: gradient[0].withOpacity(0.2),
                blurRadius: 12,
                spreadRadius: 2,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: Padding(
            padding: EdgeInsets.all(20),
            child: Row(
              children: [
                Container(
                  padding: EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: gradient,
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(15),
                    boxShadow: [
                      BoxShadow(
                        color: gradient[0].withOpacity(0.3),
                        blurRadius: 8,
                        spreadRadius: 1,
                        offset: Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Icon(icon, color: Colors.white, size: 24),
                ),
                SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
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
          ),
        ),
      ),
    );
  }

  void handleShareResults() async {
    if (analysisResult != null) {
      final text = '''
Check out my analysis results:
Height: ${analysisResult!['height']} cm
Weight: ${analysisResult!['weight']} kg
Age: ${analysisResult!['age']} years
      ''';
      await share_plus.Share.share(text);
    }
  }

  void handleDownloadReport() async {
    if (analysisResult != null) {
      final directory = await getApplicationDocumentsDirectory();
      final file = File('${directory.path}/analysis_report.txt');
      await file.writeAsString(jsonEncode(analysisResult));
      // Implement your download logic here
    }
  }

  Future<void> _initializeStats() async {
    final user = Auth().currentUser;
    if (user == null) {
      setState(() {
        _userStats = defaultStats;
      });
      return;
    }

    try {
      print('Initializing stats for user: ${user.uid}'); // Debug log
      
      // Get initial stats
      final initialStats = await _userStatsService.getUserStats(user.uid);
      if (mounted) {
        setState(() {
          _userStats = initialStats;
          print('Updated stats: ${initialStats.toJson()}'); // Debug log
        });
      }

      // Setup real-time listener
      _statsSubscription?.cancel(); // Cancel any existing subscription
      _statsSubscription = _userStatsService
          .streamUserStats(user.uid)
          .listen(
        (stats) {
          print('Received stats update: ${stats.toJson()}'); // Debug log
          if (mounted) {
            setState(() {
              _userStats = stats;
            });
          }
        },
        onError: (error) {
          print('Error in stats stream: $error');
          if (mounted) {
            setState(() {
              _userStats = defaultStats;
            });
          }
        },
      );
    } catch (e) {
      print('Error initializing stats: $e');
      if (mounted) {
        setState(() {
          _userStats = defaultStats;
        });
      }
    }
  }

  Future<void> _handleAnalysis() async {
    final user = Auth().currentUser;
    if (user == null) return;

    try {
      setState(() {
        _isAnalyzing = true;
      });

      final updatedStats = await _userStatsService.updateAfterAnalysis(user.uid);
      
      if (mounted) {
        setState(() {
          _userStats = updatedStats;
          _isAnalyzing = false;
        });
      }
      
      // Refresh stats after a short delay to ensure Firestore is updated
      await Future.delayed(Duration(milliseconds: 500));
      await refreshStats();
      
    } catch (e) {
      print('Error updating stats after analysis: $e');
      if (mounted) {
        setState(() {
          _isAnalyzing = false;
        });
      }
    }
  }

  Future<void> refreshStats() async {
    final user = Auth().currentUser;
    if (user == null) return;

    try {
      final stats = await _userStatsService.getUserStats(user.uid);
      if (mounted) {
        setState(() {
          _userStats = stats;
        });
      }
    } catch (e) {
      print('Error refreshing stats: $e');
    }
  }
}