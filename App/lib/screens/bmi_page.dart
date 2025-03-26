import 'package:flutter/material.dart';
import '../services/gemini_bmi_api.dart';

class BMIPage extends StatefulWidget {
  const BMIPage({Key? key}) : super(key: key);

  @override
  _BMIPageState createState() => _BMIPageState();
}

class _BMIPageState extends State<BMIPage> {
  final TextEditingController _heightController = TextEditingController();
  final TextEditingController _weightController = TextEditingController();
  final TextEditingController _ageController = TextEditingController();

  String? _bmiResult;
  String? _bmiAnalysis;
  String? _error;
  bool _isLoading = false;

  static const BMI_RANGES = {
    'height': {'min': 45, 'max': 250},
    'weight': {'min': 8, 'max': 300},
    'age': {'min': 1, 'max': 120},
  };

  static const Color bottomPanelBlue = Color(0xFF60A5FA);

  final GeminiApiService _geminiApiService = GeminiApiService();

  void _calculateBMI() async {
    final height = double.tryParse(_heightController.text);
    final weight = double.tryParse(_weightController.text);
    final age = int.tryParse(_ageController.text);

    if (height == null || weight == null || age == null) {
      setState(() {
        _error = 'Please enter valid numbers';
      });
      return;
    }

    if (height < BMI_RANGES['height']!['min']! || height > BMI_RANGES['height']!['max']!) {
      setState(() {
        _error = 'Height must be between ${BMI_RANGES['height']!['min']} and ${BMI_RANGES['height']!['max']} cm';
      });
      return;
    }

    if (weight < BMI_RANGES['weight']!['min']! || weight > BMI_RANGES['weight']!['max']!) {
      setState(() {
        _error = 'Weight must be between ${BMI_RANGES['weight']!['min']} and ${BMI_RANGES['weight']!['max']} kg';
      });
      return;
    }

    if (age < BMI_RANGES['age']!['min']! || age > BMI_RANGES['age']!['max']!) {
      setState(() {
        _error = 'Age must be between ${BMI_RANGES['age']!['min']} and ${BMI_RANGES['age']!['max']} years';
      });
      return;
    }

    setState(() {
      _error = null;
      _isLoading = true;
    });

    final heightInMeters = height / 100;
    final bmi = weight / (heightInMeters * heightInMeters);
    setState(() {
      _bmiResult = bmi.toStringAsFixed(2);
    });

    try {
      final prompt = '''
Give only the outputs I mention down, don't give any extra commands.
Provide a brief BMI analysis for:
BMI: ${bmi.toStringAsFixed(2)}
Height: ${height.toString()} cm
Weight: ${weight.toString()} kg
Age: ${age.toString()} years

Please format your response with these sections:

**BMI Category**
[1-2 lines about their BMI classification]

**Health Status**
[2-3 lines about current health implications]

**Quick Tips**
[Key lifestyle recommendation]
[Nutrition advice]
[Exercise suggestion]

Keep each section brief and focused on actionable insights.
''';

      String analysis = await _geminiApiService.getGeminiResponse(prompt);
      // Remove markdown syntax
      analysis = analysis.replaceAll('**', '');

      setState(() {
        _bmiAnalysis = analysis;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to get BMI analysis. Please try again.';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'BMI Calculator & Analysis',
          style: TextStyle(color: colorScheme.onBackground),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_error != null)
              Container(
                padding: EdgeInsets.all(8.0),
                margin: EdgeInsets.only(bottom: 16.0),
                decoration: BoxDecoration(
                  color: colorScheme.error.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8.0),
                ),
                child: Text(
                  _error!,
                  style: TextStyle(color: colorScheme.error),
                ),
              ),
            Text(
              'Enter your details',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: colorScheme.onBackground),
            ),
            SizedBox(height: 16),
            _buildTextField(
              controller: _heightController,
              label: 'Height (cm)',
              hint: '${BMI_RANGES['height']!['min']}-${BMI_RANGES['height']!['max']}',
              colorScheme: colorScheme,
            ),
            _buildTextField(
              controller: _weightController,
              label: 'Weight (kg)',
              hint: '${BMI_RANGES['weight']!['min']}-${BMI_RANGES['weight']!['max']}',
              colorScheme: colorScheme,
            ),
            _buildTextField(
              controller: _ageController,
              label: 'Age (years)',
              hint: '${BMI_RANGES['age']!['min']}-${BMI_RANGES['age']!['max']}',
              colorScheme: colorScheme,
            ),
            SizedBox(height: 20),
            Center(
              child: ElevatedButton(
                onPressed: _isLoading ? null : _calculateBMI,
                style: ElevatedButton.styleFrom(
                  padding: EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8.0),
                  ),
                  backgroundColor: bottomPanelBlue,
                ),
                child: _isLoading
                    ? CircularProgressIndicator(color: colorScheme.onPrimary)
                    : Text(
                        'Calculate & Analyze',
                        style: TextStyle(fontSize: 16, color: colorScheme.onPrimary),
                      ),
              ),
            ),
            if (_bmiResult != null)
              Padding(
                padding: const EdgeInsets.only(top: 32.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Your BMI: $_bmiResult',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: colorScheme.onBackground),
                    ),
                    if (_bmiAnalysis != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 16.0),
                        child: _buildAnalysisOutput(_bmiAnalysis!, colorScheme),
                      ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required ColorScheme colorScheme,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: TextField(
        controller: controller,
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8.0),
          ),
          filled: true,
          fillColor: colorScheme.surface,
          labelStyle: TextStyle(color: colorScheme.onSurface),
          hintStyle: TextStyle(color: colorScheme.onSurface.withOpacity(0.5)),
        ),
        keyboardType: TextInputType.number,
        style: TextStyle(color: colorScheme.onSurface),
      ),
    );
  }

  Widget _buildAnalysisOutput(String analysis, ColorScheme colorScheme) {
    final sections = analysis.split('\n\n');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: sections.map((section) {
        final lines = section.split('\n');
        final title = lines.first;
        final content = lines.skip(1).join('\n');
        return Container(
          width: double.infinity,
          margin: EdgeInsets.only(bottom: 16.0),
          padding: EdgeInsets.all(16.0),
          decoration: BoxDecoration(
            color: bottomPanelBlue.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8.0),
            border: Border.all(color: bottomPanelBlue.withOpacity(0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: bottomPanelBlue),
              ),
              SizedBox(height: 8),
              Text(
                content,
                style: TextStyle(fontSize: 16, color: colorScheme.onBackground),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}