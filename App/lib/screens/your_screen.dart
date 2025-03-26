class YourPage extends StatefulWidget {
  @override
  _YourPageState createState() => _YourPageState();
}

class _YourPageState extends State<YourPage> {
  final ApiService _apiService = ApiService();
  bool _isProcessing = false;

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !_isProcessing,
      onPopInvoked: (didPop) {
        if (didPop) return;
        // Show confirmation dialog if trying to pop while processing
        if (_isProcessing) {
          showDialog(
            context: context,
            builder: (context) => AlertDialog(
              title: Text('Processing in Progress'),
              content: Text('Are you sure you want to cancel the analysis?'),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: Text('Stay'),
                ),
                TextButton(
                  onPressed: () {
                    _apiService.dispose(); // This will cancel the operation
                    Navigator.of(context).pop(); // Close dialog
                    Navigator.of(context).pop(); // Go back
                  },
                  child: Text('Cancel Analysis'),
                ),
              ],
            ),
          );
        }
      },
      child: Scaffold(
        appBar: AppBar(
          leading: _isProcessing 
              ? null 
              : BackButton(onPressed: () => Navigator.of(context).maybePop()),
          title: Text('Image Analysis'),
        ),
        body: SafeArea(
          child: StreamBuilder<ProcessingStatus>(
            stream: _apiService.processingStatus,
            builder: (context, snapshot) {
              if (snapshot.data == ProcessingStatus.processing) {
                setState(() => _isProcessing = true);
              } else if (snapshot.data == ProcessingStatus.completed) {
                setState(() => _isProcessing = false);
              }

              return Stack(
                children: [
                  // Your normal content wrapped in SingleChildScrollView
                  SingleChildScrollView(
                    child: Padding(
                      padding: EdgeInsets.all(16),
                      child: YourNormalContent(),
                    ),
                  ),

                  // Loading overlay
                  if (snapshot.data == ProcessingStatus.processing)
                    Container(
                      color: Colors.black54,
                      child: Center(
                        child: Card(
                          margin: EdgeInsets.all(16),
                          child: Padding(
                            padding: EdgeInsets.all(24),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                CircularProgressIndicator(),
                                SizedBox(height: 16),
                                Text(
                                  'Analyzing image...\nPlease wait',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(fontSize: 16),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _apiService.dispose();
    super.dispose();
  }

  Future<void> handleImageAnalysis(String base64Image) async {
    // First, navigate to loading page immediately
    final navigator = Navigator.of(context);
    await navigator.pushReplacement(
      MaterialPageRoute(
        builder: (context) => LoadingPage(
          statusStream: _apiService.processingStatus,
          apiService: _apiService,
        ),
      ),
    );

    // Then start the analysis
    try {
      await _apiService.analyzeImage(base64Image, 'YOUR_COUNTRY');
    } catch (e) {
      if (kDebugMode) {
        print('Analysis error: $e');
      }
      // Error handling is now managed by LoadingPage
    }
  }
} 