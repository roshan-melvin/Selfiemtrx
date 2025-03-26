import 'dart:async';
import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import '../../services/gemini_api_pro.dart';
import '../loading_page.dart';
import '../../services/api_service.dart';
import 'package:permission_handler/permission_handler.dart';

class ProResultsScreen extends StatefulWidget {
  final Map<String, dynamic>? response;

  const ProResultsScreen({Key? key, this.response}) : super(key: key);

  @override
  _ProResultsScreenState createState() => _ProResultsScreenState();
}

class _ProResultsScreenState extends State<ProResultsScreen> {
  Map<String, String>? _sectionsMap;
  String? error;
  static const Color bottomPanelBlue = Color(0xFF60A5FA);
  final GlobalKey _screenshotKey = GlobalKey();
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    if (widget.response != null) {
      setState(() {
        _sectionsMap = widget.response!.cast<String, String>();
      });
    }
  }

  Future<Uint8List?> _captureScreenshot() async {
    try {
      final boundary = _screenshotKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
      if (boundary == null) {
        throw Exception('Failed to find render object');
      }

      final RenderBox renderBox = boundary.child as RenderBox;
      final size = renderBox.size;

      final image = await boundary.toImage(
        pixelRatio: 3.0,
      );

      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      return byteData?.buffer.asUint8List();
    } catch (e) {
      print('Error capturing screenshot: $e');
      return null;
    }
  }

  Future<bool> _requestStoragePermission() async {
    if (Platform.isAndroid) {
      // For Android 11 (API level 30) and above
      if (await Permission.manageExternalStorage.request().isGranted) {
        return true;
      }
      // For Android 10 and below
      if (await Permission.storage.request().isGranted) {
        return true;
      }
    }
    return false;
  }

  Future<void> _handleDownload(BuildContext context) async {
    setState(() => _isProcessing = true);
    
    try {
      if (!await _requestStoragePermission()) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Storage permission is required to save screenshots'),
            action: SnackBarAction(
              label: 'Settings',
              onPressed: () => openAppSettings(),
            ),
          ),
        );
        return;
      }

      final bytes = await _captureScreenshot();
      if (bytes == null) {
        throw Exception('Failed to capture screenshot');
      }

      final downloadsDir = Directory('/storage/emulated/0/Download');
      if (!await downloadsDir.exists()) {
        await downloadsDir.create(recursive: true);
      }

      final selfieMetricsDir = Directory('${downloadsDir.path}/SelfieMetrics');
      if (!await selfieMetricsDir.exists()) {
        await selfieMetricsDir.create();
      }

      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final file = File('${selfieMetricsDir.path}/pro_analysis_$timestamp.png');
      await file.writeAsBytes(bytes);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Screenshot saved to Downloads/SelfieMetrics'),
          duration: Duration(seconds: 2),
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to save screenshot: $e'),
          duration: Duration(seconds: 2),
        ),
      );
    } finally {
      setState(() => _isProcessing = false);
    }
  }

  Future<void> _shareFile(String filePath) async {
    try {
      final XFile shareFile = XFile(filePath);
      await Share.shareXFiles(
        [shareFile],
        text: 'Check out my Pro Analysis Results!'
      );
    } catch (e) {
      print('Error sharing file: $e');
      // Handle error gracefully
    }
  }

  Future<void> _handleShare(BuildContext context) async {
    setState(() => _isProcessing = true);
    
    try {
      if (!await _requestStoragePermission()) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Storage permission is required to share screenshots'),
            action: SnackBarAction(
              label: 'Settings',
              onPressed: () => openAppSettings(),
            ),
          ),
        );
        return;
      }

      final bytes = await _captureScreenshot();
      if (bytes == null) {
        throw Exception('Failed to capture screenshot');
      }

      final cacheDir = await getTemporaryDirectory();
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final file = File('${cacheDir.path}/pro_analysis_$timestamp.png');
      await file.writeAsBytes(bytes);

      await _shareFile(file.path);

      if (file.existsSync()) {
        await file.delete();
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to share screenshot: $e'),
          duration: Duration(seconds: 2),
        ),
      );
    } finally {
      setState(() => _isProcessing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (error != null) {
      return _buildErrorScreen(context);
    }

    if (_sectionsMap == null) {
      return Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(bottomPanelBlue),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text('Analysis Results'),
        actions: [
          IconButton(
            icon: _isProcessing 
              ? SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                )
              : Icon(Icons.download),
            onPressed: _isProcessing ? null : () => _handleDownload(context),
          ),
          IconButton(
            icon: _isProcessing 
              ? SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                )
              : Icon(Icons.share),
            onPressed: _isProcessing ? null : () => _handleShare(context),
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: RepaintBoundary(
          key: _screenshotKey,
          child: Container(
            color: Colors.black,
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: _buildAnalysisCards(),
              ),
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildAnalysisCards() {
    List<Widget> cards = [];
    
    if (_sectionsMap != null) {
      // Define the order of sections
      final sectionOrder = [
        'Estimated Attributes',
        'Object Detection',
        'Facial Analysis',
        'Style Enhancement Tips'
      ];
      
      // Add sections in the specified order
      for (var section in sectionOrder) {
        if (_sectionsMap!.containsKey(section)) {
          cards.add(_buildAnalysisCard(section, _sectionsMap![section]!));
        }
      }
    }
    
    return cards;
  }

  Widget _buildAnalysisCard(String title, String content) {
    return Container(
      width: double.infinity,
      margin: EdgeInsets.only(bottom: 16.0),
      padding: EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: bottomPanelBlue.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8.0),
        border: Border.all(color: bottomPanelBlue.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: bottomPanelBlue,
            ),
          ),
          SizedBox(height: 8),
          Text(
            content,
            style: TextStyle(
              fontSize: 16,
              color: Colors.white,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorScreen(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Center(
        child: Text(
          error!,
          style: TextStyle(color: Colors.white),
        ),
      ),
    );
  }
}