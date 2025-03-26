import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import '../../services/gemini_api_pro.dart';
import '../pro/pro_loading_page.dart';
import '../pro/pro_results_screen.dart';
import '../../models/analysis_model.dart';

class CameraProScreen extends StatefulWidget {
  final AnalysisModel selectedModel;

  const CameraProScreen({
    Key? key,
    required this.selectedModel,
  }) : super(key: key);

  @override
  _CameraProScreenState createState() => _CameraProScreenState();
}

class _CameraProScreenState extends State<CameraProScreen> {
  final ImagePicker _picker = ImagePicker();
  late GeminiApiProService _geminiApiPro;

  @override
  void initState() {
    super.initState();
    _geminiApiPro = GeminiApiProService();
    _openCamera(); // Automatically open camera when screen loads
  }

  Future<void> _openCamera() async {
    try {
      final XFile? photo = await _picker.pickImage(
        source: ImageSource.camera,
        preferredCameraDevice: CameraDevice.front,
        imageQuality: 85, // Adjust quality (0-100)
      );
      if (photo != null && mounted) {
        await _processImageWithGemini(photo);
      } else {
        if (mounted) Navigator.pop(context); // Go back if no photo taken
      }
    } catch (e) {
      if (kDebugMode) {
        print('Error taking photo: $e');
      }
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to take photo')),
        );
      }
    }
  }

  Future<void> _processImageWithGemini(XFile photo) async {
    try {
      // Read and encode image
      final bytes = await photo.readAsBytes();
      final base64Image = base64Encode(bytes);
      
      if (!mounted) return;
      
      // Start analysis
      if (kDebugMode) {
        print('Using Gemini Pro API Service');
      }
      final analysisFuture = _geminiApiPro.analyzeImage(base64Image, widget.selectedModel.country);
      
      // Show loading screen
      await Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => ProLoadingPage(
            statusStream: _geminiApiPro.processingStatus,
            apiService: _geminiApiPro,
            customLoadingText: 'Analyzing with Gemini Pro Vision...',
          ),
        ),
      );
      
      // Wait for analysis to complete
      await analysisFuture;

      // Navigate to ProResultsScreen
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => ProResultsScreen(
              response: _geminiApiPro.getLastResults(),
            ),
          ),
        );
      }
    } catch (e) {
      if (kDebugMode) {
        print('Error processing image: $e');
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to process image')),
        );
        Navigator.pop(context);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // This screen will be very briefly visible before camera opens
    return Scaffold(
      backgroundColor: Colors.black,
      body: Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}