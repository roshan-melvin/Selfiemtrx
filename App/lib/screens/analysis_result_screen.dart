import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../widgets/loading_dialog.dart';

class ResultsScreen extends StatefulWidget {
  final Map<String, dynamic> results;

  const ResultsScreen({Key? key, required this.results}) : super(key: key);

  @override
  State<ResultsScreen> createState() => _ResultsScreenState();
}

class _ResultsScreenState extends State<ResultsScreen> {
  final GlobalKey _screenshotKey = GlobalKey();
  bool _hasCheckedPermissions = false;
  int _imageCounter = 0; // Counter for sequential filenames

  @override
  void initState() {
    super.initState();
    _loadCounter(); // Load the counter from shared preferences
    _checkInitialPermissions();
  }

  // Load the counter from shared preferences
  Future<void> _loadCounter() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _imageCounter = prefs.getInt('imageCounter') ?? 0;
    });
  }

  // Save the counter to shared preferences
  Future<void> _saveCounter() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('imageCounter', _imageCounter);
  }

  Future<void> _checkInitialPermissions() async {
    if (!_hasCheckedPermissions) {
      final status = await Permission.storage.status;
      if (status.isDenied) {
        // Wait a bit for the screen to be ready
        await Future.delayed(Duration(milliseconds: 500));
        if (mounted) {
          await _requestStoragePermission();
        }
      }
      _hasCheckedPermissions = true;
    }
  }

  Future<void> _handleShare() async {
    if (!mounted) return;

    try {
      // Show loading dialog
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (BuildContext context) => LoadingDialog(
          message: 'Preparing to share...',
        ),
      );

      // Capture screenshot
      final bytes = await _captureScreenshot();
      
      // Close dialog regardless of result
      if (mounted) {
        Navigator.of(context).pop();
      }

      if (bytes == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to capture screenshot'),
              backgroundColor: Colors.red,
            ),
          );
        }
        return;
      }

      // Save screenshot to temporary file
      final tempDir = await getTemporaryDirectory();
      final file = File('${tempDir.path}/results_screenshot.png');
      await file.writeAsBytes(bytes);

      // Create text summary
      final textSummary = _createTextSummary();

      if (!mounted) return;

      // Share using share_plus
      try {
        await Share.shareXFiles(
          [XFile(file.path)],
          text: textSummary,
          subject: 'Analysis Results',
        );
      } finally {
        // Clean up temp file after sharing
        if (file.existsSync()) {
          await file.delete().catchError((e) => print('Error deleting temp file: $e'));
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to share: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _handleDownload() async {
    try {
      // Request storage permission first
      if (!await _requestStoragePermission()) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Storage permission is required to save images'),
              backgroundColor: Colors.red,
            ),
          );
        }
        return;
      }

      if (!mounted) return;

      // Show loading dialog
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (BuildContext context) => LoadingDialog(
          message: 'Saving results...',
        ),
      );

      // Capture screenshot
      final bytes = await _captureScreenshot();
      
      // Close dialog regardless of result
      if (mounted) {
        Navigator.of(context).pop();
      }

      if (bytes == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to capture screenshot'),
              backgroundColor: Colors.red,
            ),
          );
        }
        return;
      }

      // Get storage directory
      final String path = Platform.isAndroid 
          ? '/storage/emulated/0/Download'  // Android Downloads folder
          : (await getApplicationDocumentsDirectory()).path;  // iOS Documents folder
      
      final directory = Directory(path);

      // Create directory if it doesn't exist
      if (!await directory.exists()) {
        await directory.create(recursive: true);
      }

      // Find next available number
      int nextNumber = 1;
      bool fileExists = true;
      while (fileExists) {
        final testFile = File('${directory.path}/sm$nextNumber.jpg');
        if (!await testFile.exists()) {
          fileExists = false;
        } else {
          nextNumber++;
        }
      }

      // Create file with sequential name
      final fileName = 'sm$nextNumber.jpg';
      final file = File('${directory.path}/$fileName');
      
      // Save the file
      await file.writeAsBytes(bytes);

      // Notify media scanner for Android
      if (Platform.isAndroid) {
        try {
          final channel = const MethodChannel('com.example.app/media_scanner');
          await channel.invokeMethod('scanFile', {'path': file.path});
        } catch (e) {
          print('Media scanner error: $e');
        }
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              Platform.isAndroid 
                  ? 'Saved to Downloads: $fileName'
                  : 'Saved as: $fileName'
            ),
            duration: const Duration(seconds: 5),
            action: SnackBarAction(
              label: 'SHARE',
              onPressed: () => _shareFile(file),
            ),
          ),
        );
      }
    } catch (e) {
      print('Download error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<bool> _requestStoragePermission() async {
    if (Platform.isAndroid) {
      // For Android 11 (API level 30) and above
      if (await Permission.manageExternalStorage.request().isGranted) {
        return true;
      }
      
      // For older Android versions
      final status = await Permission.storage.request();
      return status.isGranted;
    }
    
    // For iOS
    return await Permission.photos.request().isGranted;
  }

  Future<void> _shareFile(File file) async {
    try {
      final textSummary = _createTextSummary();
      await Share.shareXFiles(
        [XFile(file.path)],
        text: textSummary,
        subject: 'Analysis Results',
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to share: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<Uint8List?> _captureScreenshot() async {
    try {
      final boundary = _screenshotKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
      if (boundary == null) return null;

      final image = await boundary.toImage(pixelRatio: 3.0);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      
      return byteData?.buffer.asUint8List();
    } catch (e) {
      print('Screenshot error: $e');
      return null;
    }
  }

  String _createTextSummary() {
    return '''
Analysis Results:
Age: ${widget.results['age']} years
Gender: ${widget.results['gender']}
Height: ${widget.results['height_depth_based']?.toStringAsFixed(2) ?? 'N/A'} cm
Weight Range: ${widget.results['weight_range'] ?? 'N/A'} kg
Emotion: ${widget.results['emotion']?.toString().toUpperCase() ?? 'N/A'}
''';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text('Analysis Results'),
        actions: [
          IconButton(
            icon: Icon(Icons.share),
            onPressed: _handleShare,
          ),
          IconButton(
            icon: Icon(Icons.download),
            onPressed: _handleDownload,
          ),
        ],
      ),
      body: RepaintBoundary(
        key: _screenshotKey,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Person's Info Card
              Card(
                margin: EdgeInsets.all(16),
                color: Colors.grey[900],
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Person\'s Information',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      SizedBox(height: 16),
                      _buildInfoRow('Age', '${widget.results['age']} years'),
                      _buildInfoRow('Gender', '${widget.results['gender']}'),
                      _buildInfoRow(
                        'Height', 
                        '${widget.results['height_depth_based']?.toStringAsFixed(2) ?? 'N/A'} cm'
                      ),
                      _buildInfoRow('Weight Range', '${widget.results['weight_range'] ?? 'N/A'} kg'),
                      _buildInfoRow('Emotion', '${widget.results['emotion']?.toString().toUpperCase() ?? 'N/A'}'),
                    ],
                  ),
                ),
              ),

              // Objects Detected Card
              if (widget.results['detected_objects'] != null)
                Card(
                  margin: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  color: Colors.grey[900],
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Detected Objects',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(height: 16),
                        ...(widget.results['detected_objects'] as List).map((obj) => 
                          _buildObjectItem(obj)
                        ).toList(),
                      ],
                    ),
                  ),
                ),

              // Additional Information Card
              Card(
                margin: EdgeInsets.all(16),
                color: Colors.grey[900],
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Additional Information',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      SizedBox(height: 16),
                      _buildInfoRow('Race', '${widget.results['race'] ?? 'N/A'}'),
                      _buildInfoRow('Country', '${widget.results['country'] ?? 'N/A'}'),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: Colors.grey[400],
              fontSize: 16,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildObjectItem(Map<String, dynamic> obj) {
    return Container(
      margin: EdgeInsets.only(bottom: 8),
      padding: EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.black26,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            obj['object_name']?.toString().toUpperCase() ?? 'Unknown Object',
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