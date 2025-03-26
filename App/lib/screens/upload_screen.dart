import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api_service.dart';
import '../utils/string_extensions.dart';
import '../screens/loading_page.dart';
import '../models/analysis_model.dart';

class UploadScreen extends StatefulWidget {
  final AnalysisModel selectedModel;

  const UploadScreen({
    Key? key,
    required this.selectedModel,
  }) : super(key: key);

  @override
  _UploadScreenState createState() => _UploadScreenState();
}

class _UploadScreenState extends State<UploadScreen> {
  bool isDragging = false;
  String? error;
  bool isLoading = false;
  double uploadProgress = 0;
  Map<String, dynamic>? analysisResult;
  bool showPersonInfo = true;
  late ApiService _apiService;

  @override
  void initState() {
    super.initState();
    _apiService = ApiService();
  }

  Future<void> handleFileUpload(File file) async {
    if (!mounted) return;
    
    try {
      setState(() {
        isLoading = true;
        error = null;
        uploadProgress = 0;
      });

      // Read the file as bytes and convert to base64
      final List<int> imageBytes = await file.readAsBytes();
      final String base64Image = base64Encode(imageBytes);

      // Start the analysis first but don't await it
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
                onTap: () async {
                  final picker = ImagePicker();
                  final pickedFile = await picker.pickImage(source: ImageSource.gallery);
                  if (pickedFile != null) {
                    await handleFileUpload(File(pickedFile.path));
                  }
                },
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isDragging ? Colors.blue : Colors.grey[700]!,
                      width: 2,
                    ),
                    color: isDragging ? Colors.white.withOpacity(0.1) : Colors.white.withOpacity(0.05),
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
                          'Tap to select an image',
                          style: TextStyle(color: Colors.grey[400]),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            if (analysisResult != null) ...[
              SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _buildToggleButton(
                    "Person's Info",
                    showPersonInfo,
                    () => setState(() => showPersonInfo = true),
                  ),
                  SizedBox(width: 16),
                  _buildToggleButton(
                    "Object Details",
                    !showPersonInfo,
                    () => setState(() => showPersonInfo = false),
                  ),
                ],
              ),
              SizedBox(height: 24),
              if (showPersonInfo)
                _buildPersonInfo()
              else
                _buildObjectDetails(),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildToggleButton(String label, bool isSelected, VoidCallback onTap) {
    return ElevatedButton(
      onPressed: onTap,
      style: ElevatedButton.styleFrom(
        backgroundColor: isSelected ? Color(0xFF3B82F6) : Colors.white.withOpacity(0.1),
        padding: EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      child: Text(label),
    );
  }

  Widget _buildPersonInfo() {
    return Container(
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey[700]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "Person's Info",
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          SizedBox(height: 16),
          _buildInfoGrid([
            {
              'label': 'Age',
              'value': '${analysisResult?['age'] ?? 'N/A'} years',
            },
            {
              'label': 'Gender',
              'value': (analysisResult?['gender']?.toString() ?? 'N/A').capitalize(),
            },
            {
              'label': 'Height (Depth)',
              'value': analysisResult?['height_depth_based'] != null 
                ? '${analysisResult!['height_depth_based'].toStringAsFixed(1)} cm' 
                : 'N/A',
            },
            {
              'label': 'Height (Reference)',
              'value': analysisResult?['height_reference_based'] != null 
                ? '${analysisResult!['height_reference_based'].toStringAsFixed(1)} cm' 
                : 'N/A',
            },
            {
              'label': 'Weight Range',
              'value': analysisResult?['weight_range'] ?? 'N/A',
            },
            {
              'label': 'Emotion',
              'value': (analysisResult?['emotion']?.toString() ?? 'N/A').capitalize(),
            },
          ]),
        ],
      ),
    );
  }

  Widget _buildObjectDetails() {
    final detectedObjects = analysisResult?['detected_objects'] as List<dynamic>? ?? [];
    final personCount = detectedObjects.where((obj) => obj['object_name'] == 'person').length;
    final objectCount = detectedObjects.where((obj) => obj['object_name'] != 'person').length;

    return Container(
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey[700]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Object Details',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          SizedBox(height: 16),
          _buildInfoCard('Number of Persons Detected', personCount.toString()),
          SizedBox(height: 8),
          _buildInfoCard('Number of Objects Detected', objectCount.toString()),
          if (detectedObjects.isNotEmpty) ...[
            SizedBox(height: 16),
            Text(
              'Detected Objects',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.grey[400],
              ),
            ),
            SizedBox(height: 8),
            ...detectedObjects.map((obj) => _buildObjectCard(obj)),
          ],
        ],
      ),
    );
  }

  Widget _buildInfoGrid(List<Map<String, String>> items) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: NeverScrollableScrollPhysics(),
      mainAxisSpacing: 16,
      crossAxisSpacing: 16,
      childAspectRatio: 1.5,
      children: items.map((item) => _buildInfoCard(item['label']!, item['value']!)).toList(),
    );
  }

  Widget _buildInfoCard(String label, String value) {
    return Container(
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: Colors.grey[400],
              fontSize: 14,
            ),
          ),
          SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildObjectCard(Map<String, dynamic> obj) {
    return Container(
      margin: EdgeInsets.only(bottom: 8),
      padding: EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            obj['object_name'] ?? 'Unknown Object',
            style: TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          SizedBox(height: 4),
          Text(
            'Confidence: ${((obj['confidence_score'] ?? 0) * 100).toStringAsFixed(2)}%',
            style: TextStyle(color: Colors.grey[400]),
          ),
          if (obj['height_cm'] != null)
            Text(
              'Height: ${obj['height_cm'].toStringAsFixed(2)} cm',
              style: TextStyle(color: Colors.grey[400]),
            ),
        ],
      ),
    );
  }
} 