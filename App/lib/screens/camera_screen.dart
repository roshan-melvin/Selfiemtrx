import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api_service.dart';
import '../screens/loading_page.dart';
import '../models/analysis_model.dart';

class CameraScreen extends StatefulWidget {
  final AnalysisModel selectedModel;

  const CameraScreen({
    Key? key,
    required this.selectedModel,
  }) : super(key: key);

  @override
  _CameraScreenState createState() => _CameraScreenState();
}

class _CameraScreenState extends State<CameraScreen> {
  final ImagePicker _picker = ImagePicker();
  late ApiService _apiService;

  @override
  void initState() {
    super.initState();
    _apiService = ApiService();
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
        await _processImage(photo);
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

  Future<void> _processImage(XFile photo) async {
    try {
      // Read and encode image
      final bytes = await photo.readAsBytes();
      final base64Image = base64Encode(bytes);

      // Start analysis
      final analysisFuture = _apiService.analyzeImage(base64Image, widget.selectedModel.country);

      // Show loading screen
      if (!mounted) return;
      await Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => LoadingPage(
            statusStream: _apiService.processingStatus,
            apiService: _apiService,
          ),
        ),
      );

      // Wait for analysis to complete
      await analysisFuture;

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