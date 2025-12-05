# ⏱️ Time Tracker Widget - Chrome Extension

A beautiful, draggable widget that tracks how much time you spend on websites like Twitter, Facebook, Instagram, and any other site you want to monitor.

## ✨ Features

- **Minimal by Default**: Shows just the timer, hover to see controls
- **Draggable Widget**: Move the timer anywhere on the page
- **5 Curated Themes**: Dark, Light, Blue, Minimal Dark, and Transparent
- **Flexible Tracking**: Track all sites or only specific ones you choose
- **Real-time Tracking**: See exactly how long you've been on a site
- **Color-coded Warnings**: Green → Orange → Red as time increases
- **Persistent Storage**: Tracks daily time spent on each site
- **Privacy-focused**: All data stored locally on your device
- **Clean Design**: Modern design that doesn't distract
- **Easy Configuration**: Full settings page for customization

## 🚀 Installation

### Preview First!

**Want to see the automatic hover behavior?**
- Open `HOVER_DEMO.html` in your browser for an interactive demo
- Open `PREVIEW_NEW.html` to see all 5 themes
- Read `FINAL_DESIGN.md` to understand the design philosophy

### Method 1: Load Unpacked (For Testing)

1. Download all the extension files to a folder on your computer
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the folder containing the extension files
6. The extension is now installed! 🎉

### Method 2: Manual Installation

1. Download the extension folder
2. Open Chrome
3. Navigate to `chrome://extensions/`
4. Turn on "Developer mode" 
5. Click "Load unpacked" and select the extension folder

## 📖 How to Use

### Basic Usage

1. Visit any website (Twitter, Facebook, Instagram, etc.)
2. The timer widget appears showing just the time
3. **Hover over it** to see site name, close button, and reset button
4. **Drag the widget**: Click and hold to move it anywhere

### Customization

**Click the extension icon → Settings button** to access:

#### 🎨 Themes
- **Dark** - Sleek and minimal (default)
- **Light** - Clean and bright
- **Blue** - Professional look
- **Minimal Dark** - Subtle & unobtrusive
- **Transparent** - Almost invisible with colored timer

#### 🌐 Tracking Mode
- **Track All Websites** - Shows timer everywhere (default)
- **Specific Sites Only** - Choose which sites to track

### Widget Behavior

- **Default**: Shows just the timer (minimal space)
- **On Hover**: Expands to show all controls
- **Draggable**: Move it anywhere on the page
- **Auto-saves**: Position and time data saved automatically

### Other Features

- **Hide Widget**: Hover and click "×" to hide on a specific site
- **Reset Timer**: Hover and click "Reset" to reset today's counter
- **View Stats**: Click the extension icon to see all tracked time

### Color System

- 🟢 **Green** (0-30 minutes): You're doing great!
- 🟠 **Orange** (30-60 minutes): Maybe time for a break?
- 🔴 **Red** (60+ minutes): You've been here a while!

## 🎨 Themes

We've carefully designed 5 themes for different preferences:

### 🌑 Dark (Default)
Solid dark background with subtle transparency. Perfect for focus and minimal distraction.

### ☀️ Light
Clean white background for daytime browsing. Easy on the eyes in bright environments.

### 🔵 Blue  
Professional blue gradient. Great for work-related sites.

### 🌫️ Minimal Dark
Very subtle semi-transparent dark overlay. Almost invisible but still functional.

### 👻 Transparent
Nearly invisible background with bold colored timer. Maximum subtlety with clear time display.

## ⚙️ Configuration

Right-click the extension icon → Options (or click Settings in popup) to configure:
- Choose your theme
- Select tracking mode (all sites vs specific sites)
- Manage list of tracked sites

The widget automatically shows just the timer by default and expands on hover - no configuration needed!

## 📁 File Structure

```
time-tracker-extension/
├── manifest.json       # Extension configuration
├── content.js          # Main timer logic
├── styles.css          # Widget styling
├── popup.html          # Settings interface
├── popup.js            # Settings logic
├── icon16.png          # Small icon
├── icon48.png          # Medium icon
├── icon128.png         # Large icon
└── README.md           # This file
```

## 🔒 Privacy

- **100% Local**: All data is stored locally on your device
- **No Tracking**: We don't collect or send any data anywhere
- **No Internet Required**: Works completely offline
- **No Permissions Abuse**: Only asks for storage and tab access

## 🐛 Troubleshooting

**Widget not appearing?**
- Check if it was previously hidden on that site
- Open the extension popup and look for the site in "Hidden Sites"
- Click "Show" to make it visible again

**Timer not saving?**
- Make sure you're not in Incognito mode
- Check Chrome storage permissions for the extension

**Widget position resets?**
- The position is saved per-browser, not per-site
- Try dragging it again and wait a moment before closing the tab

## 🚀 Future Ideas

Want to contribute or suggest features? Here are some ideas:

- [ ] Custom time goals per site
- [ ] Weekly/monthly statistics
- [ ] Export data to CSV
- [ ] Customizable themes
- [ ] Notification when time limit is reached
- [ ] Whitelist mode (only track specific sites)
- [ ] Productivity score
- [ ] Break reminders

## 📝 License

Free to use and modify for personal use!

## 💡 Tips

1. **Be Honest**: Don't close the widget just because you don't like what it's telling you!
2. **Set Goals**: Use the visual feedback to set personal time limits
3. **Review Daily**: Check the popup each evening to see where your time went
4. **Adjust Position**: Place it where you'll see it but it won't interfere with content

---

**Made with ❤️ to help you be more mindful of your time online**

Enjoy your new time awareness! 🎯
# time-tracker-widget
