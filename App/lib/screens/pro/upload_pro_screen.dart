import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import '../../services/gemini_api_pro.dart';
import '../pro/pro_loading_page.dart';
import '../pro/pro_results_screen.dart';
import '../../models/analysis_model.dart';

class UploadProScreen extends StatefulWidget {
  final AnalysisModel selectedModel;

  const UploadProScreen({
    Key? key,
    required this.selectedModel,
  }) : super(key: key);

  @override
  _UploadProScreenState createState() => _UploadProScreenState();
}

class _UploadProScreenState extends State<UploadProScreen> {
  final ImagePicker _picker = ImagePicker();
  late GeminiApiProService _geminiApiPro;
  bool isLoading = false;
  String? error;

  @override
  void initState() {
    super.initState();
    _geminiApiPro = GeminiApiProService();
  }

  Future<void> _uploadImage() async {
    try {
      final XFile? photo = await _picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 85,
      );

      if (photo != null && mounted) {
        await _processImageWithGemini(photo);
      }
    } catch (e) {
      if (kDebugMode) {
        print('Error picking image: $e');
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to pick image')),
        );
      }
    }
  }

  Future<void> _processImageWithGemini(XFile photo) async {
    try {
      setState(() {
        isLoading = true;
        error = null;
      });

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
    } finally {
      if (mounted) {
        setState(() {
          isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back),
          color: Colors.white,
          onPressed: () => Navigator.pop(context),
        ),
        title: Text('Upload Image'),
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (error != null)
              Container(
                padding: EdgeInsets.all(16),
                margin: EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.withOpacity(0.5)),
                ),
                child: Text(
                  error!,
                  style: TextStyle(color: Colors.red),
                ),
              ),
            Container(
              height: 300,
              child: GestureDetector(
                onTap: _uploadImage,
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: Colors.grey[700]!,
                      width: 2,
                    ),
                    color: Colors.white.withOpacity(0.05),
                  ),
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.cloud_upload,
                          size: 64,
                          color: Colors.grey[400],
                        ),
                        SizedBox(height: 16),
                        Text(
                          'Tap to upload an image',
                          style: TextStyle(
                            color: Colors.grey[400],
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}