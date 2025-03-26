import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class GeminiApiService {
  final String _apiKey = 'AIzaSyBoAPEKSmkMuHya6B1QGaz020kfY1K8U8s';
  final String _apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  Future<String> getGeminiResponse(String prompt) async {
    try {
      final response = await http.post(
        Uri.parse('$_apiUrl?key=$_apiKey'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'contents': [
            {'parts': [{'text': prompt}]}
          ]
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['candidates']?[0]['content']['parts']?[0]['text'] ?? 'No response';
      } else {
        throw Exception('Failed to get Gemini response: ${response.statusCode}');
      }
    } catch (error) {
      print('Error getting Gemini response: $error');
      throw error;
    }
  }
}

// Your BMI calculation and UI logic remains the same, but now it will call the updated Gemini service!
// Let me know if you want me to tweak anything or improve the BMI analysis prompt. 🚀
