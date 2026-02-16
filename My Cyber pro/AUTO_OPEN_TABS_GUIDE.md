# Auto-Open Tabs Feature for Pentest Lab

## ✅ What Was Implemented

The pentest lab (and all other labs) now automatically open their service URLs in new browser tabs when you start the lab.

## 🎯 Features

### 1. **Automatic Tab Opening**
- When you click "Start Lab", the system waits 3 seconds for containers to initialize
- Then automatically opens each service in a new browser tab:
  - **Attacker Terminal** (Port 7681) - Ubuntu Terminal with Pentesting Tools
  - **DVWA Target** (Port 8081) - Damn Vulnerable Web Application
  - **Juice Shop Target** (Port 3001) - OWASP Juice Shop

### 2. **Smart Staggering**
- Tabs open with a 300ms delay between each to avoid browser pop-up blockers
- Each tab has a unique name to prevent overwriting

### 3. **Pop-up Blocker Detection**
- The system detects if your browser blocks any pop-ups
- Shows a warning notification if tabs are blocked
- You can still manually open services using the "Open →" buttons

### 4. **Visual Notifications**
- **Info** (Blue): "Opening 3 service tab(s)..."
- **Success** (Green): "Successfully opened 3 service tab(s)!"
- **Warning** (Orange): "Some tabs were blocked by your browser..."

## 🔧 How to Use

1. **Navigate to Labs**: Go to `/labs.html` or click "Labs" in the navigation
2. **Select Pentest Lab**: Click on "Penetration Testing" lab
3. **Start the Lab**: Click the "🚀 Start Lab" button
4. **Wait for Auto-Open**: After 3 seconds, tabs will automatically open
5. **Allow Pop-ups**: If prompted, allow pop-ups for localhost

## 🌐 Browser Settings

### To Enable Pop-ups for Localhost:

**Chrome/Edge:**
1. Click the pop-up blocked icon in the address bar
2. Select "Always allow pop-ups from localhost"
3. Reload the page

**Firefox:**
1. Click the blocked pop-up notification
2. Select "Allow pop-ups for localhost"
3. Reload the page

## 📝 Technical Details

### Files Modified:

1. **`public/js/lab-detail.js`**
   - Enhanced `startLab()` function with auto-open logic
   - Added `showNotification()` helper function
   - Implemented pop-up blocker detection

2. **`public/css/lab-detail.css`**
   - Added notification styles (`.lab-notification`)
   - Added slide-in animation
   - Added responsive mobile styles

3. **`server.js`** (Already configured)
   - Returns `autoOpen: true` flag
   - Returns services array with URLs

4. **`db.js`** (Already configured)
   - Pentest lab has 3 services configured
   - Services are properly parsed from JSON

### Service Configuration:

```javascript
services: [
    { 
        name: 'Attacker Terminal', 
        port: 7681, 
        url: 'http://localhost:7681',
        description: 'Ubuntu Terminal with Pentesting Tools' 
    },
    { 
        name: 'DVWA Target', 
        port: 8081, 
        url: 'http://localhost:8081',
        description: 'Damn Vulnerable Web Application' 
    },
    { 
        name: 'Juice Shop Target', 
        port: 3001, 
        url: 'http://localhost:3001',
        description: 'OWASP Juice Shop' 
    }
]
```

## 🐛 Troubleshooting

### Tabs Not Opening?

1. **Check Browser Console**: Press F12 and look for errors
2. **Allow Pop-ups**: Make sure pop-ups are enabled for localhost
3. **Check Docker**: Ensure Docker containers are running
4. **Manual Open**: Use the "Open →" buttons in the Services panel

### Services Not Loading?

1. **Wait Longer**: Containers may take 10-30 seconds to fully start
2. **Check Ports**: Ensure ports 7681, 8081, and 3001 are not in use
3. **Restart Lab**: Stop and restart the lab
4. **Check Docker Logs**: Look for container startup errors

## 🎨 Notification Types

- **Info** (🔵 Blue border): Informational messages
- **Success** (🟢 Green border): Successful operations
- **Warning** (🟠 Orange border): Warnings or issues

## 📱 Mobile Support

The notification system is fully responsive and works on mobile devices with adjusted positioning and sizing.

## 🚀 Next Steps

1. Start your server: `npm start`
2. Login with default credentials: `admin` / `admin123`
3. Navigate to the Pentest lab
4. Click "Start Lab" and watch the magic happen! ✨
