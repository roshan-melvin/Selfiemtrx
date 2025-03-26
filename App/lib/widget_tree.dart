import 'package:flutter/material.dart';
import 'auth.dart';
import 'screens/login_register_page.dart';
import 'app.dart';  // Import your main app screen

class WidgetTree extends StatefulWidget {
  const WidgetTree({Key? key}) : super(key: key);

  @override
  State<WidgetTree> createState() => _WidgetTreeState();
}

class _WidgetTreeState extends State<WidgetTree> {
  @override
  Widget build(BuildContext context) {
    return StreamBuilder(
      stream: Auth().authStateChanges,
      builder: (context, snapshot) {
        if (snapshot.hasData) {
          return MyApp(cameras: []);  // Pass empty list temporarily
        } else {
          return const LoginPage();
        }
      },
    );
  }
}
