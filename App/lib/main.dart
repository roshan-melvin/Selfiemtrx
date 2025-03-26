import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:flutter_downloader/flutter_downloader.dart';
import 'package:firebase_core/firebase_core.dart';
import 'widget_tree.dart';
import 'services/subscription_service.dart';

late List<CameraDescription> cameras;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await FlutterDownloader.initialize();
  await Firebase.initializeApp();
  cameras = await availableCameras();
  
  // Initialize subscription service
  final subscriptionService = SubscriptionService();
  await subscriptionService.refreshProStatus();
  
  runApp(MaterialApp(
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      brightness: Brightness.dark,
      primarySwatch: Colors.blue,
    ),
    home: const WidgetTree(),
  ));
}