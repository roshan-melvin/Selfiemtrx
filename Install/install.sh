#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Function to install dependencies for the App directory
install_app() {
    echo "Installing dependencies for App..."
    # Navigate to the App directory
    cd App
    # Install Flutter dependencies
    flutter pub get
    # Navigate back to the root directory
    cd ..
}

# Function to install dependencies for the ML directory
install_ml() {
    echo "Installing dependencies for ML..."
    # Navigate to the ML directory
    cd ML
    # Create a virtual environment
    python3 -m venv venv
    # Activate the virtual environment
    source venv/bin/activate
    # Install Python dependencies
    pip install -r requirements.txt
    # Deactivate the virtual environment
    deactivate
    # Navigate back to the root directory
    cd ..
}

# Function to install dependencies for the Website directory
install_website() {
    echo "Installing dependencies for Website..."
    # Navigate to the Website directory
    cd Website
    # Install Node.js dependencies
    npm install
    # Navigate back to the root directory
    cd ..
}

# Main script execution
echo "Starting installation process..."

install_app
install_ml
install_website

echo "Installation completed successfully!"
