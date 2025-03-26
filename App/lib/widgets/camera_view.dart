import 'dart:io';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:flutter/services.dart';

class CameraView extends StatelessWidget {
  final CameraController controller;
  final Function() onTakePhoto;
  final Function() onSwitchCamera;
  final Function() onBack;
  final bool showSwitchCamera;

  const CameraView({
    Key? key,
    required this.controller,
    required this.onTakePhoto,
    required this.onSwitchCamera,
    required this.onBack,
    this.showSwitchCamera = true,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Stack(
          children: [
            if (controller.value.isInitialized)
              Center(
                child: CameraPreview(controller),
              ),
            Positioned(
              bottom: 32,
              left: 0,
              right: 0,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  if (showSwitchCamera)
                    _buildCameraButton(
                      Icons.flip_camera_ios,
                      onSwitchCamera,
                    ),
                  _buildCaptureButton(onTakePhoto),
                  SizedBox(width: 56),
                ],
              ),
            ),
            Positioned(
              top: 16,
              left: 16,
              child: IconButton(
                icon: Icon(Icons.arrow_back),
                color: Colors.white,
                onPressed: onBack,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCameraButton(IconData icon, VoidCallback onPressed) {
    return Container(
      width: 56,
      height: 56,
      decoration: BoxDecoration(
        color: Colors.black54,
        shape: BoxShape.circle,
      ),
      child: IconButton(
        icon: Icon(icon),
        color: Colors.white,
        onPressed: () {
          HapticFeedback.mediumImpact();
          onPressed();
        },
      ),
    );
  }

  Widget _buildCaptureButton(VoidCallback onPressed) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.mediumImpact();
        onPressed();
      },
      child: Container(
        width: 80,
        height: 80,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 4),
        ),
        child: Container(
          margin: EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
          ),
        ),
      ),
    );
  }
}
