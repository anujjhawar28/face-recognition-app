# 🎭 Face Recognition App

A complete cross-platform face recognition application that works seamlessly on **Android**, **iPhone**, and **Desktop browsers**. Built with vanilla JavaScript and face-api.js (TensorFlow.js), this Progressive Web App (PWA) provides real-time face detection, recognition, and registration capabilities.

## ✨ Features

- 🎥 **Real-time Face Detection** - Detects faces in real-time using your device camera
- 👤 **Face Recognition** - Recognizes registered faces with similarity percentage
- 📝 **Face Registration** - Capture and save faces with names for future recognition
- �️ **Liveness Detection** - Prevents photo spoofing by detecting real human presence (blink + movement)- 📋 **Attendance Tracking** - Automatically records attendance with timestamp when faces are recognized
- ⏰ **Smart Duplicate Prevention** - Prevents duplicate attendance entries for the same day
- 📊 **Attendance Reports** - View, filter, and export attendance records as CSV- �😊 **Expression Detection** - Identifies facial expressions (happy, sad, neutral, etc.)
- 📱 **Cross-Platform** - Works on Android, iOS (iPhone/iPad), and Desktop browsers
- 🔄 **Camera Switching** - Switch between front and rear cameras on mobile devices
- 💾 **Local Storage** - All face data stored locally on your device
- 🌐 **Works Offline** - Progressive Web App that works without internet after first load
- 🎨 **Responsive Design** - Beautiful UI that adapts to all screen sizes
- 🔒 **Privacy First** - All processing happens on your device, no data sent to servers

## 📱 Platform Support

### Desktop Browsers
- ✅ Google Chrome (Recommended)
- ✅ Microsoft Edge
- ✅ Firefox
- ✅ Safari

### Mobile Devices
- ✅ Android (Chrome, Firefox)
- ✅ iPhone/iPad (Safari)
- ✅ Tablets (All platforms)

## 🚀 Getting Started

### Quick Start

1. **Clone or Download** this repository
   ```bash
   git clone https://github.com/yourusername/face-recognition-app.git
   cd face-recognition-app
   ```

2. **Serve the Application**
   
   You need a local web server to run the app. Choose one:

   **Option A: Using Python**
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   ```

   **Option B: Using Node.js (http-server)**
   ```bash
   npx http-server -p 8000
   ```

   **Option C: Using PHP**
   ```bash
   php -S localhost:8000
   ```

   **Option D: Using Live Server (VS Code Extension)**
   - Install "Live Server" extension in VS Code
   - Right-click on `index.html` and select "Open with Live Server"

3. **Open in Browser**
   ```
   http://localhost:8000
   ```

4. **Allow Camera Permission**
   - Your browser will ask for camera permission
   - Click "Allow" to use the app

## 📖 How to Use

### 1. Start the Camera
- Click the **"Start Camera"** button
- Allow camera permissions when prompted
- The camera feed will appear with real-time face detection

### 2. Register a Face (with Liveness Detection)
- Position your face in front of the camera
- Click **"Register Face (with Liveness)"** button
- **Liveness Check will start:**
  - 👁️ **Blink naturally** - The app will detect your blink
  - 🔄 **Move your head slightly** - Small movements prove you're real
  - ⏱️ Complete within 15 seconds
- ✅ If liveness verified (real person detected):
  - Enter the person's name in the input field
  - Click **"Save"** to register the face
- ❌ If liveness fails (photo/picture detected):
  - You'll see an error: "PHOTO DETECTED!"
  - Cannot register until liveness check passes

### 3. Automatic Face Recognition & Attendance
- Once faces are registered, the app will **automatically recognize them**
- When a registered face is detected:
  - ✅ **First time today**: Attendance is marked with timestamp
    - Notification: "Attendance marked successfully!"
    - Record added to attendance table
  - ⚠️ **Already marked today**: Shows duplicate message
    - Notification: "Your attendance is already marked for today!"
    - No duplicate entry created
- Recognized faces show the person's name and similarity percentage
- DetecManage Attendance Records
- **View Records**: See all attendance entries in the table
- **Today's Count**: See how many people marked attendance today
- **Total Count**: View total attendance records
- **Clear Today**: Remove today's attendance records only
- **Clear All Records**: Delete all attendance history
- **Export CSV**: Download attendance records as a spreadsheet

### 6. tion info panel shows details about detected faces and expressions

### 4. Manage Registered Faces
- View all registered faces in the "Registered Faces" section
- Delete individual faces by clicking the "Delete" button on each face card
- Clear all faces using the "Clear All Faces" button

### 5. Switch Camera (Mobile)
- Click **"Switch Camera"** to toggle between front and rear cameras
- Works on mobile devices with multiple camer and attendance records
- **Service Worker** - Offline capability (PWA)
- **Vanilla JavaScript** - No framework dependencies
- **CSV Export** - Download attendance data

### Technologies Used
- **face-api.js** - Face detection and recognition using TensorFlow.js
- **MediaDevices API** - Camera access
- **Canvas API** - Drawing detection overlays
- **LocalStorage** - Storing registered faces
- **Service Worker** - Offline capability (PWA)
- **Vanilla JavaScript** - No framework dependencies

### AI Models
The app uses the following pre-trained models from face-api.js:
- **Tiny Face Detector** - Fast face detection optimized for mobile
- **Face Landmark 68** - Facial landmark detection
- **Face Recognition** - Face descriptor generation for recognition
- **Face Expression** - Emotion/expression detection

### Project Structure
```
Face Recognition/
├── index.html          # Main HTML file
├── styles.css          # Styling and responsive design
├── app.js              # Main application logic
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker for offline capability
├── icon-192.png        # App icon (192x192)
├── icon-512.png        # App icon (512x512)
└── README.md           # This file
```

## 📱 Installing as PWA

### On Android
1. Open the app in Chrome
2. Tap the menu (⋮) and select "Install app" or "Add to Home screen"
3. The app will be installed like a native app

### On iPhone/iPad
1. Open the app in Safari
2. Tap the Share button (square with arrow)
3. Select "Add to Home Screen"
4. Tap "Add"

### On Desktop
1. Open the app in Chrome/Edge
2. Look for the install icon (➕) in the address bar
3. Click "Install"
Liveness Detection** - Prevents photo/picture spoofing with blink and movement detection
- **Anti-Spoofing** - Rejects registration attempts using photos or static images
- **
## 🔒 Privacy & Security

- **No Server Communication** - All processing happens locally on your device
- **No Data Collection** - We don't collect, store, or transmit any personal data
- **Local Storage Only** - Face data is stored only in your browser's local storage
- **HTTPS Required** - Camera access requires HTTPS (or localhost for development)
- **User Control** - You can delete all data anytime

## ⚙️ Configuration

### Adjusting Recognition Sensitivity
In `app.js`, find the `findBestMatch()` method:
```javascript
if (distance < 0.6) { // Threshold
```
- Lower value (e.g., 0.4) = More strict matching
- Higher value (e.g., 0.7) = More lenient matching

### Detection Frequency
In `app.js`, find:
```javascript
this.detectionInterval = setInterval(detectFaces, 100);
```
- Change `100` to adjust detection frequency (milliseconds)
- Higher values = Better performance, less frequent updates
- Lower values = More frequent updates, higher CPU usage

## 🐛 Troubleshooting

### Camera Not Working
- **Check Permissions**: Ensure camera permission is granted in browser settings
- **HTTPS Required**: Camera only works on HTTPS or localhost
- **Browser Support**: Use a modern browser (Chrome recommended)
- **Device Camera**: Ensure your device has a working camera

### Face Not Detected
- **Lighting**: Ensure good lighting conditions
- **Face Position**: Face the camera directly
- **Distance**: Stay within 1-3 feet of the camera
- **Model Loading**: Wait for AI models to fully load

### Recognition Not Accurate
- **Register Multiple Times**: Register the same person 2-3 time

### Liveness Check Failing
- **Natural Behavior**: Blink naturally and move your head slightly
- **Good Lighting**: Ensure your face is well-lit
- **Face the Camera**: Look directly at the camera
- **Be Patient**: The check takes a few seconds - don't rush
- **Avoid Glasses**: Sunglasses might interfere with blink detection

### "Photo Detected" Error
- **Using a Real Person**: Make sure you're not holding up a photo
- **Screen/Monitor**: Don't point camera at another screen showing a face
- **Movement Required**: The app needs to see natural blinking and head movement
- **Timeout**: Complete the liveness check within 15 secondss at different angles
- **Good Quality**: Capture faces in good lighting
- **Adjust Threshold**: Modify the recognition threshold in code

### App Not Loading
- **Internet Required** (First Time): First load requires internet to download AI models
- **Clear Cache**: Try clearing browser cache and reload
- **Check Console**: Open browser developer console (F12) for error messages

## 🌐 Deployment

### Deploy to GitHub Pages
1. Create a GitHub repository
2. Push all files to the repository
3. Go to Settings > Pages
4. Select main branch as source
5. Your app will be available at `https://username.github.io/repo-name/`

### Deploy to Netlify
1. Create account on [Netlify](https://netlify.com)
2. Drag and drop your project folder
3. Your app is deployed!

### Deploy to Vercel
```bash
npm i -g vercel
vercel
```

## 📊 Performance

- **Model Load Time**: 3-5 seconds (first load)
- **Detection Speed**: ~10 FPS on mobile, ~30 FPS on desktop
- **Storage Usage**: ~5-10MB for models, ~50KB per registered face
- **Browser Compatibility**: Modern browsers with WebGL support

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [face-api.js](https://github.com/justadudewhohacks/face-api.js) - Face recognition library
- [TensorFlow.js](https://www.tensorflow.org/js) - Machine learning in the browser

## 📞 Support

If you encounter any issues or have questions:
1. Check the Troubleshooting section above
2. Open an issue on GitHub
3. Check browser console for error messages

## 🔄 Version History

### v1.2.0 (Current)
- ✨ **NEW:** Attendance tracking with timestamps
- ✨ **NEW:** Smart duplicate prevention
- ✨ **NEW:** CSV export functionality
- ✨ **NEW:** Real-time notifications
- Liveness detection (anti-spoofing)
- Blink and movement detection
- Real-time face detection
- Face recognition and registration
- Expression detection
- Cross-platform support
- PWA capabilities
- Camera switching

---

**Made with ❤️ for cross-platform face recognition**

*Note: This app processes all data locally on your device. No data is sent to external servers.*

