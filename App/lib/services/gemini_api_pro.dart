import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../services/api_service.dart';

class GeminiApiProService extends ApiService {
  final String _apiKey = 'AIzaSyBoAPEKSmkMuHya6B1QGaz020kfY1K8U8s';
  final String _apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  final _processingStatusController = StreamController<ProcessingStatus>.broadcast();
  Stream<ProcessingStatus> get processingStatus => _processingStatusController.stream;
  Map<String, dynamic>? _lastResults;

  static const String _promptTemplate = '''Estimated Attributes:
    Height = "" cm
    Weight = "" kg
    Age = "" years
    Gender = ""
    Emotion = "" (section over, give a big line break)
    
    Object Detection:
    No. of Persons Detected = ""
    No. of Objects Detected = "" (give a big line break)
    Detected Objects:
    (List only non-human objects such as:
    - Electronic devices (phones, laptops, cameras)
    - Furniture (chairs, tables, desks)
    - Clothing items (jackets, shirts, hats)
    - Accessories (bags, watches, jewelry)
    - Animals (dogs, cats, birds, etc.)
    - Other items (books, bottles, glasses)
    
    DO NOT include body parts or facial features.
    Format each object as follows:)
    Object Name: ""
    Confidence: ""
    Estimated Height: "" cm

    (Repeat the above 3 lines for each detected object)
    (section over, give a big line break)

Facial Analysis:
    Face Shape: Provide a detailed 2-3 sentence description of the face shape, including its overall form, proportions, and how it affects facial harmony.

    Eye Shape and Expression: Describe the eye shape, size, positioning, and any unique characteristics in 2-3 sentences. Include details about how they contribute to facial expression.

    Nose Characteristics: Explain the nose structure, bridge, tip, and how it complements other facial features in 2-3 sentences.

    Lip Shape and Fullness: Detail the lip shape, volume, cupid's bow, and overall balance in 2-3 sentences.

    Jawline Definition: Describe jawline strength, angle, and how it frames the face in 2-3 sentences.

    Facial Symmetry: Analyze overall facial balance and harmony in 2-3 sentences, noting how features work together.

    General Expression: Describe the natural expression and the impression it creates in 2-3 sentences.

    Style Enhancement Tips (provide exactly 3 detailed suggestions):
    1. A specific hairstyle or grooming recommendation that complements their features
    2. A personalized suggestion about facial features enhancement through skincare or subtle techniques
    3. A style recommendation about accessories or clothing that would enhance their facial features

    Only fill the values inside the quotation marks with a single estimated value each—no extra words, characters, or symbols. DO NOT INCLUDE THE QUOTATIONS< ITS FOR A PLACEHOLDER STUFF. 
    Use all contextual clues available to make the most accurate assessment possible.
    IMPORTANT: Only detect non-human objects. Exclude all body parts from object detection.''';

  String get promptTemplate => _promptTemplate;

  @override
  Map<String, dynamic> getLastResults() {
    return _lastResults ?? {};
  }

  @override
  Future<Map<String, dynamic>> analyzeImage(String base64Image, String country) async {
    try {
      _processingStatusController.add(ProcessingStatus.processing);
      final response = await getGeminiResponse(_promptTemplate, base64Image);
      
      // Parse the response into sections
      final Map<String, String> sections = {};
      
      // Extract Estimated Attributes
      if (response.contains('Estimated Attributes:')) {
        sections['Estimated Attributes'] = _extractSection(response, 'Estimated Attributes:', 'Object Detection:');
      }
      
      // Extract Object Detection
      if (response.contains('Object Detection:')) {
        sections['Object Detection'] = _extractSection(response, 'Object Detection:', 'Facial Analysis:');
      }
      
      // Extract Facial Analysis
      if (response.contains('Facial Analysis:')) {
        sections['Facial Analysis'] = _extractSection(response, 'Facial Analysis:', 'Style Enhancement Tips');
      }
      
      // Extract Style Enhancement Tips
      if (response.contains('Style Enhancement Tips')) {
        sections['Style Enhancement Tips'] = _extractSection(response, 'Style Enhancement Tips', 'Only fill the values');
      }

      _lastResults = sections;
      _processingStatusController.add(ProcessingStatus.completed);
      return _lastResults!;
    } catch (e) {
      _processingStatusController.add(ProcessingStatus.error);
      throw e;
    }
  }

  String _extractSection(String text, String startMarker, String endMarker) {
    final startIndex = text.indexOf(startMarker);
    final endIndex = text.indexOf(endMarker);
    if (startIndex == -1) return '';
    if (endIndex == -1) return text.substring(startIndex).trim();
    return text.substring(startIndex, endIndex).trim();
  }

  Future<String> getGeminiResponse(String prompt, String base64Image) async {
    try {
      if (base64Image == null) {
        throw Exception('No image data provided');
      }

      final Map<String, dynamic> requestBody = {
        'contents': [
          {
            'parts': [
              {
                'text': prompt
              },
              {
                'inline_data': {
                  'mime_type': 'image/jpeg',
                  'data': base64Image
                }
              }
            ]
          }
        ]
      };

      final response = await http.post(
        Uri.parse('$_apiUrl?key=$_apiKey'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(requestBody),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['candidates']?[0]['content']['parts']?[0]['text'] ?? '';
      } else {
        throw Exception('Failed to get Gemini response: ${response.statusCode}');
      }
    } catch (error) {
      print('Error getting Gemini response: $error');
      throw error;
    }
  }

  void cancelOperation() {
    // Implement cancellation logic if needed
  }
}
