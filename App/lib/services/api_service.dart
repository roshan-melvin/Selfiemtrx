import 'dart:convert';
import 'dart:io';
import 'dart:async';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  
  ApiException(this.message, [this.statusCode]);
  
  @override
  String toString() => 'ApiException: $message${statusCode != null ? ' (Status: $statusCode)' : ''}';
}

// Add enum at the top level, before the class declarations
enum ProcessingStatus {
  notStarted,
  processing,
  completed,
  error
}

class ApiService {
  final String baseUrl = 'https://selfiemtrx-mtrx-m1.hf.space';
  
  // Rate limiting
  static const _maxRequestsPerMinute = 10;
  static const _requestWindow = Duration(minutes: 1);
  final _requestTimestamps = <DateTime>[];
  
  // Maximum image size (10MB)
  static const _maxImageSize = 10 * 1024 * 1024;

  // Change from final to late
  late StreamController<ProcessingStatus> _processingStatusController = 
      StreamController<ProcessingStatus>.broadcast();
  Stream<ProcessingStatus> get processingStatus => _processingStatusController.stream;

  // Add a cancellation token
  bool _isCancelled = false;

  // Add field to store last results
  Map<String, dynamic>? _lastResults;

  Future<bool> _checkRateLimit() async {
    final now = DateTime.now();
    _requestTimestamps.removeWhere(
      (timestamp) => now.difference(timestamp) > _requestWindow
    );
    
    if (_requestTimestamps.length >= _maxRequestsPerMinute) {
      return false;
    }
    
    _requestTimestamps.add(now);
    return true;
  }

  Future<Map<String, dynamic>> analyzeImage(String base64Image, String country) async {
    // Reset cancellation state
    _isCancelled = false;
    
    // Reset the controller if it's closed
    if (_processingStatusController.isClosed) {
      _processingStatusController = StreamController<ProcessingStatus>.broadcast();
    }
    
    try {
      _processingStatusController.add(ProcessingStatus.processing);

      // Input validation
      if (base64Image.isEmpty) {
        throw ApiException('Image data cannot be empty', 400);
      }

      // Clean up base64 string and add proper prefix
      String cleanBase64 = base64Image.replaceAll(RegExp(r'\s+'), ''); // Remove whitespace
      cleanBase64 = cleanBase64.replaceAll('data:image/jpeg;base64,', ''); // Remove any existing prefix
      final imageData = 'data:image/jpeg;base64,$cleanBase64';

      if (kDebugMode) {
        print('Sending image data length: ${imageData.length}');
      }

      // Make API request with retry mechanism
      final response = await _makeRequestWithRetry(() => http.post(
        Uri.parse('$baseUrl/analyze'),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode({
          'image': imageData,
          'country': country,
        }),
      )).timeout(
        Duration(seconds: 120),
        onTimeout: () => throw ApiException('Request timed out', 408),
      );

      // Check response status first
      if (response.statusCode != 200) {
        if (kDebugMode) {
          print('Server error response: ${response.body}');
          print('Status code: ${response.statusCode}');
        }
        throw ApiException(
          'Server error: ${response.statusCode}',
          response.statusCode
        );
      }

      // Try to parse JSON response
      try {
        final result = _parseResponse(response);
        _lastResults = result;
        _processingStatusController.add(ProcessingStatus.completed);
        return result;
      } catch (e) {
        if (kDebugMode) {
          print('Parse error: $e');
          print('Response body: ${response.body}');
        }
        throw ApiException('Failed to parse server response', response.statusCode);
      }
      
    } catch (e) {
      if (!_processingStatusController.isClosed) {
        _processingStatusController.add(ProcessingStatus.error);
      }
      if (kDebugMode) {
        print('Analysis error: $e');
      }
      rethrow;
    }
  }

  Future<http.Response> _makeRequestWithRetry(Future<http.Response> Function() request) async {
    const maxRetries = 3;
    const initialDelay = Duration(seconds: 1);
    
    for (var attempt = 0; attempt < maxRetries; attempt++) {
      try {
        final response = await request();
        
        // If we get a 5xx error, retry
        if (response.statusCode >= 500) {
          if (attempt < maxRetries - 1) {
            if (kDebugMode) {
              print('Server error (${response.statusCode}), retrying...');
            }
            await Future.delayed(initialDelay * (attempt + 1));
            continue;
          }
        }
        
        return response;
      } catch (e) {
        if (attempt == maxRetries - 1) rethrow;
        
        await Future.delayed(initialDelay * (attempt + 1));
        if (kDebugMode) {
          print('Retry attempt ${attempt + 1} after error: $e');
        }
      }
    }
    
    throw ApiException('Max retries exceeded');
  }

  Map<String, dynamic> _parseResponse(http.Response response) {
    try {
      // Check status code first
      if (response.statusCode != 200) {
        throw ApiException(
          'Server returned error: ${response.statusCode}',
          response.statusCode,
        );
      }

      // Try to parse JSON
      final responseData = jsonDecode(response.body);
      
      if (responseData == null) {
        throw ApiException('Empty response from server');
      }

      if (responseData is! Map) {
        throw ApiException('Response is not a JSON object');
      }

      // Convert to Map<String, dynamic> with null-safe parsing
      return {
        'age': _parseNum(responseData['age']),
        'gender': responseData['gender']?.toString(),
        'country': responseData['country']?.toString(),
        'emotion': responseData['emotion']?.toString(),
        'race': responseData['race']?.toString(),
        'height_depth_based': _parseNum(responseData['height_depth_based']),
        'height_reference_based': _parseNum(responseData['height_reference_based']),
        'weight_range': responseData['weight_range']?.toString(),
        'detected_objects': _parseDetectedObjects(responseData['detected_objects']),
        'output_image_path': responseData['output_image_path']?.toString(),
        'corrected_height': _parseNum(responseData['corrected_height']),
        'estimated_height': _parseNum(responseData['estimated_height']),
      };
    } catch (e) {
      if (kDebugMode) {
        print('Response parsing error: $e');
        print('Response body: ${response.body}');
        print('Response headers: ${response.headers}');
      }
      throw ApiException('Failed to parse response: $e');
    }
  }

  num? _parseNum(dynamic value) {
    if (value == null) return null;
    if (value is num) return value;
    if (value is String) {
      try {
        // Handle string numbers with dashes
        if (value.contains('-')) {
          return num.parse(value.split('-')[0].trim());
        }
        return num.parse(value);
      } catch (_) {
        return null;
      }
    }
    return null;
  }

  List<Map<String, dynamic>> _parseDetectedObjects(dynamic objects) {
    if (objects == null) return [];
    if (objects is! List) {
      if (kDebugMode) {
        print('Detected objects is not a list: $objects');
      }
      return [];
    }
    
    return objects.map((obj) {
      if (obj is! Map) return null;
      
      return {
        'object_name': obj['object_name']?.toString(),
        'confidence_score': _parseNum(obj['confidence_score']) ?? 0.0,
        'height_cm': _parseNum(obj['height_cm']),
        'height_pixels': _parseNum(obj['height_pixels']),
      };
    }).whereType<Map<String, dynamic>>().toList();
  }

  void _logError(String message) {
    if (kDebugMode) {
      print('API Error: $message');
    }
    // You can implement more sophisticated logging here
  }

  Future<Map<String, dynamic>> estimateTotalHeightAndWeight(
    double estimatedHeadHeight, 
    int age, 
    String gender, 
    String country, 
    List<dynamic> heightDataset
  ) async {
    // Validate inputs
    if (estimatedHeadHeight <= 0 || 
        age <= 0 || 
        gender.isEmpty || 
        country.isEmpty || 
        heightDataset.isEmpty) {
      throw Exception('Invalid input parameters');
    }

    try {
      // Process height estimation
      // Implementation details...
      return {}; // Return processed data
    } catch (e) {
      print('Error in height estimation'); //Error in height estimation: $e
      throw Exception('Failed to estimate height and weight'); //Failed to estimate height and weight: $e
    }
  }

  Future<List<dynamic>> detectObjects(String imagePath) async {
    try {
      if (!File(imagePath).existsSync()) {
        throw Exception('Image file not found');
      }

      // Object detection implementation
      // Implementation details...
      return []; // Return detected objects
    } catch (e) {
      print('Error in object detection'); //Error in object detection: $e
      throw Exception('Failed to detect objects'); //Failed to detect objects: $e
    }
  }

  // Update isProcessing getter to be more reliable
  bool get isProcessing {
    if (_processingStatusController.isClosed) return false;
    
    ProcessingStatus lastStatus = ProcessingStatus.notStarted;
    _processingStatusController.stream.listen((status) {
      lastStatus = status;
    });
    
    return lastStatus == ProcessingStatus.processing;
  }

  // Update cancel operation method
  void cancelOperation() {
    _isCancelled = true;
    if (!_processingStatusController.isClosed) {
      _processingStatusController.add(ProcessingStatus.error);
      dispose();
    }
  }

  // Update dispose method
  void dispose() {
    _isCancelled = true;
    if (!_processingStatusController.isClosed) {
      _processingStatusController.close();
    }
  }

  // Add method to get last results
  Map<String, dynamic> getLastResults() {
    return _lastResults ?? {};
  }
}
