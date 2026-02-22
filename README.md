# 🌸PCO-US - Multi-Signal Ovulation Intelligence System

<img width="1536" height="696" alt="image" src="https://github.com/user-attachments/assets/20321ad3-d426-41eb-b0b5-e529ff993df7" />

## 📍Problem Statement
The reliability of ovulation tracking is a critical issue for individuals and healthcare providers. Traditional methods often lack precision, leading to inaccurate predictions of fertile windows and difficulties in family planning. The PCO-US system addresses these challenges by providing a robust solution that leverages modern technology.

## 📍What Was Built
The PCO-US Multi-Signal Ovulation Intelligence System is an integrated solution that combines wearable data, baseline modeling, LH (Luteinizing Hormone) analysis, and AI-lite inference for accurate ovulation tracking. The system collects multisource data to offer real-time insights into an individual's ovulation cycle.

### 📍System Architecture

#### 1. Hardware Layer
- **ESP32**: The main microcontroller that interfaces with all sensors and processes data. 
- **MAX30105**: A sensor for monitoring heart rate and SpO2 levels.
- **DS18B20**: A waterproof temperature sensor used for accurate body temperature readings.
- **MPU6050**: A motion sensor to gather movement data for more comprehensive health tracking.

#### 2. Backend Flask API Layer
The backend is built using Flask and provides several endpoints to interact with the data:
- **/api/vitals**: Retrieve current vitals data.
- **/api/latest**: Fetch the latest recorded data.
- **/api/day/close**: Fetch the end-of-day processed data.
- **/api/day/simulate**: Simulate daily data for testing and analysis.
- **/api/lh/analyze**: Analyze Luteinizing Hormone data for ovulation prediction.

#### 3. Frontend React Dashboard
The front end is developed using React, complemented by Vite for fast builds, Tailwind for styling, and Firebase for authentication and Firestore for data storage. The dashboard provides an intuitive user interface to visualize the collected data and insights.

### 📍Baseline Logic Formulas
- **HR/HRV/Temp Averaging**: Algorithms are implemented for averaging heart rate, heart rate variability, and temperature to establish baseline metrics that are crucial for accurate ovulation predictions.

### 📍AI-Lite Inference Engine
The inference engine uses structured rules to evaluate the severity of data patterns, apply stress estimation methodologies, and make predictions regarding the ovulation cycle.

### 📍LH Strip Computer Vision Processing
Using OpenCV and SciPy, the system processes LH test strips to determine hormone concentrations effectively and accurately.

### 📍Live and Simulated Hybrid Model Approach
The system integrates both real-time data collection from users and simulated models to refine and enhance predictive analytics.

### 📍Complete Data Flow
Data flows seamlessly from the ESP32 through the Flask backend to the React frontend, ensuring users have access to the most up-to-date information at all times.

### 📍Strengths and Key Features
- Reliable and accurate ovulation predictions.
- Comprehensive health monitoring through multiple data sources.
- User-friendly interface with real-time insights and feedback.
- Advanced data processing capabilities leveraging AI methodologies.

This full-stack system represents a significant advancement in ovulation tracking technology, merging hardware advancements with modern software solutions to enhance user experience and health outcomes.
