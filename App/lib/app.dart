import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'screens/home_screen.dart';
import 'screens/upgrade_screen.dart';

class MyApp extends StatelessWidget {
  final List<CameraDescription> cameras;

  const MyApp({super.key, required this.cameras});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Selfie Metrics',
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: Colors.black,
        colorScheme: ColorScheme.dark(
          primary: Color(0xFF60A5FA),
          secondary: Color(0xFFA78BFA),
          surface: Color(0xFF1E1E1E),
        ),
        textTheme: TextTheme(
          headlineLarge: TextStyle(
            fontSize: 40,
            fontWeight: FontWeight.bold,
            height: 1.2,
          ),
          headlineMedium: TextStyle(
            fontSize: 32,
            fontWeight: FontWeight.bold,
          ),
          bodyLarge: TextStyle(
            fontSize: 18,
            height: 1.5,
          ),
          bodyMedium: TextStyle(
            fontSize: 16,
            height: 1.5,
          ),
        ),
        pageTransitionsTheme: PageTransitionsTheme(
          builders: {
            TargetPlatform.android: CupertinoPageTransitionsBuilder(),
            TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
          },
        ),
      ),
      routes: {
        '/': (context) => HomeScreen(cameras: cameras),
        '/upgrade': (context) => UpgradeScreen(),
      },
      initialRoute: '/',
    );
  }
}