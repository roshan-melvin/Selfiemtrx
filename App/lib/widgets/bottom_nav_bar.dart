import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:image_picker/image_picker.dart';

class BottomNavBar extends StatelessWidget {
  final int currentIndex;
  final Function(int) onTap;
  final bool isAnalyzeMenuOpen;
  final VoidCallback onAnalyzePressed;
  final VoidCallback onCameraPressed;
  final VoidCallback onUploadPressed;

  const BottomNavBar({
    required this.currentIndex,
    required this.onTap,
    required this.isAnalyzeMenuOpen,
    required this.onAnalyzePressed,
    required this.onCameraPressed,
    required this.onUploadPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Container(
          height: 80,
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.8),
          ),
          child: SafeArea(
            top: false,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildNavItem(0, Icons.home, 'Home'),
                _buildNavItem(1, Icons.chat, 'Chat'),
                _buildAnalyzeButton(),
                _buildNavItem(2, Icons.analytics, 'Analysis'),
                _buildNavItem(3, Icons.person, 'Profile'),
              ],
            ),
          ),
        ),
        if (isAnalyzeMenuOpen)
          Positioned(
            bottom: 80,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Transform.translate(
                  offset: Offset(-40, -20),
                  child: _buildActionButton(
                    icon: Icons.camera_alt,
                    label: 'Camera',
                    gradient: [Color(0xFF60A5FA), Color(0xFF3B82F6)],
                    onPressed: onCameraPressed,
                  ),
                ),
                Transform.translate(
                  offset: Offset(40, -20),
                  child: _buildActionButton(
                    icon: Icons.upload_file,
                    label: 'Upload',
                    gradient: [Color(0xFFA78BFA), Color(0xFF7C3AED)],
                    onPressed: onUploadPressed,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildNavItem(int index, IconData icon, String label) {
    final isSelected = currentIndex == index;
    
    return InkWell(
      onTap: () => onTap(index),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: isSelected ? Color(0xFF60A5FA) : Colors.grey[600],
              size: 28,
            ),
            SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Color(0xFF60A5FA) : Colors.grey[600],
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAnalyzeButton() {
    return Container(
      width: 65,
      height: 65,
      margin: EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.black,
        boxShadow: [
          BoxShadow(
            color: Color(0xFF60A5FA).withOpacity(0.5),
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
        border: Border.all(
          color: Color(0xFF60A5FA),
          width: 2.5,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onAnalyzePressed,
          customBorder: CircleBorder(),
          child: Center(
            child: AnimatedRotation(
              duration: Duration(milliseconds: 300),
              turns: isAnalyzeMenuOpen ? 0.125 : 0,
              child: Icon(
                Icons.add,
                color: Color(0xFF60A5FA),
                size: 35,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required List<Color> gradient,
    required VoidCallback onPressed,
  }) {
    return GestureDetector(
      onTap: onPressed,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: gradient,
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: gradient[0].withOpacity(0.3),
                  blurRadius: 8,
                  spreadRadius: 2,
                  offset: Offset(0, 2),
                ),
              ],
            ),
            child: Icon(icon, color: Colors.white),
          ),
          SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              color: Colors.white,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}