# Face Recognition App - Testing Guide

## Quick Test Checklist

### Desktop Testing
- [ ] Open app in Chrome/Edge
- [ ] Allow camera permission
- [ ] Click "Start Camera"
- [ ] Verify face detection works
- [ ] Register a face with your name
- [ ] Verify face recognition works
- [ ] Test expression detection
- [ ] Stop and restart camera
- [ ] Verify registered face persists after reload

### Mobile Testing (Android)
- [ ] Open in Chrome mobile
- [ ] Allow camera permission
- [ ] Test face detection
- [ ] Register a face
- [ ] Switch between front/rear cameras
- [ ] Test in portrait and landscape
- [ ] Install as PWA (Add to Home Screen)
- [ ] Test offline functionality

### Mobile Testing (iPhone)
- [ ] Open in Safari
- [ ] Allow camera permission
- [ ] Test face detection
- [ ] Register a face
- [ ] Switch cameras (if available)
- [ ] Add to Home Screen
- [ ] Test as standalone app

## Known Limitations
- Requires good lighting
- Works best with direct face view
- First load requires internet for AI models
- Camera permission required
