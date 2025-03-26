import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart' as share_plus;
import 'package:flutter_downloader/flutter_downloader.dart';
import 'package:path_provider/path_provider.dart';
import 'package:http/http.dart' as http;
import 'dart:io';
import 'dart:convert';

class Helpers {
  // Add your backend URL
  static const String baseUrl = 'https://29a1-49-206-100-222.ngrok-free.app';  // Update this with your backend URL

  static void showErrorMessage(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  static Future<void> shareResults(Map<String, dynamic> results) async {
    try {
      final tempDir = await getTemporaryDirectory();
      final imagePath = '${tempDir.path}/analyzed_image.jpg';
      
      // Get the image from the results
      if (results['output_image_path'] != null) {
        // Update the image URL to match your backend's endpoint
        final imageUrl = '$baseUrl/get_image/${results['output_image_path']}';  // Update this endpoint
        
        final response = await http.get(Uri.parse(imageUrl)).timeout(
          Duration(seconds: 30),
          onTimeout: () => throw Exception('Request timed out'),
        );
        
        if (response.statusCode == 200) {
          // Save the image to temporary directory
          final file = File(imagePath);
          await file.writeAsBytes(response.bodyBytes);
          
          // Create a formatted text report
          final reportText = '''
Analysis Results:
Age: ${results['age']} years
Gender: ${results['gender']}
Height: ${results['height_depth_based']?.toStringAsFixed(2)} cm
Weight Range: ${results['weight_range']} kg
Emotion: ${results['emotion']}
''';

          // Share both the image and text
          await share_plus.Share.shareXFiles(
            [share_plus.XFile(imagePath)],
            text: reportText,
          );
        } else {
          print('Failed to download image. Status: ${response.statusCode}, Body: ${response.body}');
          throw Exception('Failed to download image: ${response.statusCode}');
        }
      }
    } catch (e) {
      print('Error sharing results: $e');
      rethrow;
    }
  }

  static Future<void> downloadReport(Map<String, dynamic> results) async {
    try {
      final directory = await getApplicationDocumentsDirectory();
      
      // Download and save the image
      if (results['output_image_path'] != null) {
        // Update the image URL to match your backend's endpoint
        final imageUrl = '$baseUrl/get_image/${results['output_image_path']}';  // Update this endpoint
        
        final response = await http.get(Uri.parse(imageUrl)).timeout(
          Duration(seconds: 30),
          onTimeout: () => throw Exception('Request timed out'),
        );
        
        if (response.statusCode == 200) {
          final imagePath = '${directory.path}/analyzed_image.jpg';
          final imageFile = File(imagePath);
          await imageFile.writeAsBytes(response.bodyBytes);
          
          // Create a PDF or HTML report with the image and results
          final reportPath = '${directory.path}/analysis_report.html';
          final reportContent = '''
<!DOCTYPE html>
<html>
<head>
    <title>Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; background: #1a1a1a; color: #ffffff; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        img { max-width: 100%; height: auto; border-radius: 8px; }
        .results { margin-top: 20px; background: #2d2d2d; padding: 20px; border-radius: 8px; }
        h1, h2 { color: #4fc3f7; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #3d3d3d; }
        .label { color: #9e9e9e; }
        .value { color: #ffffff; font-weight: 500; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Analysis Report</h1>
        <img src="analyzed_image.jpg" alt="Analyzed Image">
        <div class="results">
            <h2>Results</h2>
            <div class="info-row">
                <span class="label">Age:</span>
                <span class="value">${results['age']} years</span>
            </div>
            <div class="info-row">
                <span class="label">Gender:</span>
                <span class="value">${results['gender']}</span>
            </div>
            <div class="info-row">
                <span class="label">Height:</span>
                <span class="value">${results['height_depth_based']?.toStringAsFixed(2)} cm</span>
            </div>
            <div class="info-row">
                <span class="label">Weight Range:</span>
                <span class="value">${results['weight_range']} kg</span>
            </div>
            <div class="info-row">
                <span class="label">Emotion:</span>
                <span class="value">${results['emotion']}</span>
            </div>
            <div class="info-row">
                <span class="label">Race:</span>
                <span class="value">${results['race']}</span>
            </div>
        </div>
    </div>
</body>
</html>
''';
          
          final reportFile = File(reportPath);
          await reportFile.writeAsString(reportContent);
          
          // Use flutter_downloader to save the report
          final taskId = await FlutterDownloader.enqueue(
            url: 'file://$reportPath',
            savedDir: directory.path,
            fileName: 'analysis_report.html',
            showNotification: true,
            openFileFromNotification: true,
          );

          if (taskId == null) {
            throw Exception('Failed to create download task');
          }
        } else {
          print('Failed to download image. Status: ${response.statusCode}, Body: ${response.body}');
          throw Exception('Failed to download image: ${response.statusCode}');
        }
      }
    } catch (e) {
      print('Error downloading report: $e');
      rethrow;
    }
  }
}