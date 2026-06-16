<div align="center">

<!-- Banner Title -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=FFD700,1a1a1a&height=200&section=header&text=ALUMNI%20CONNECT%20//_&fontSize=52&fontColor=FFD700&fontAlignY=38&desc=Where%20Mentorship%20Meets%20Innovation&descAlignY=60&descColor=ffffff&animation=fadeIn" width="100%"/>

<!-- Badges Row 1 – Status -->
![Version](https://img.shields.io/badge/version-1.0.0-FFD700?style=for-the-badge&logo=git&logoColor=black)
![Status](https://img.shields.io/badge/status-active-success?style=for-the-badge&logo=statuspage&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge&logo=open-source-initiative&logoColor=white)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=for-the-badge&logo=github&logoColor=white)

<!-- Badges Row 2 – Tech Stack -->
![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)

<br/>

> **A modern mobile platform forging real connections between current students and experienced graduates.**

<br/>

</div>

---

## 📑 Table of Contents

| Section | Description |
|---|---|
| [🗄️ About](#️-about-the-project) | What is Alumni Connect? |
| [✨ Key Features](#-key-features) | Core capabilities of the platform |
| [🛠️ Tech Stack](#️-tech-stack) | Technologies used |
| [💻 Getting Started](#-getting-started) | Setup guide |
| [📂 Project Structure](#-project-structure) | Codebase organization |
| [📦 Releases](#-releases) | Version history |
| [📄 License](#-license) | License information |

---

## 🗄️ About The Project

<div align="center">

```
╔══════════════════════════════════════════════════════════╗
║   🎓  Bridging the gap between students and alumni  🤝   ║
╚══════════════════════════════════════════════════════════╝
```

</div>

**Alumni Connect** is a mobile networking application built for one purpose — **meaningful peer-to-peer guidance**. Whether you are a student looking for mentorship or an alumnus wanting to give back, this platform bridges the gap with a focused, distraction-free experience.

> 💡 *No bloated dashboards. No donation modules. Just pure networking and mentorship.*

---

## ✨ Key Features

<div align="center">

| Feature | Description | Status |
|---|---|---|
| 🔐 **Role-Based Onboarding** | Tailored sign-up flows for Students & Alumni via Firebase Auth | ✅ Live |
| 📢 **Community Feed** | Dynamic space to share updates, ask questions & stay engaged | ✅ Live |
| 🔍 **Mentorship Directory** | Searchable alumni directory for finding the right mentor | ✅ Live |
| 💬 **Direct Messaging** | Private 1:1 conversations between students and mentors | ✅ Live |
| 🔔 **Push Notifications** | Stay updated on replies, connections & feed activity | 🔄 Planned |

</div>

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology | Purpose |
|---|---|---|
| 📱 **Frontend** | React Native | Cross-platform mobile UI |
| 🔥 **Auth** | Firebase Authentication | Secure role-based login |
| 🗃️ **Database** | Cloud Firestore | Real-time NoSQL database |
| 🖼️ **Storage** | Firebase Storage | Profile photos & media |
| 🧭 **Navigation** | React Navigation | Screen routing & transitions |

</div>

---

## 💻 Getting Started

### Prerequisites

Ensure the following are installed on your machine:

![Node.js](https://img.shields.io/badge/Node.js-v16+-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![npm](https://img.shields.io/badge/npm-latest-CB3837?style=flat-square&logo=npm&logoColor=white)
![Android Studio](https://img.shields.io/badge/Android_Studio-required-3DDC84?style=flat-square&logo=androidstudio&logoColor=white)
![Xcode](https://img.shields.io/badge/Xcode-Mac_only-147EFB?style=flat-square&logo=xcode&logoColor=white)

---

### Installation

**Step 1 — Clone the repository**
```bash
git clone https://github.com/yuvrajshrirame/alumni-connect.git
cd alumni-connect
```

**Step 2 — Install dependencies**
```bash
# Using npm
npm install

# OR using yarn
yarn install
```

**Step 3 — iOS Setup *(Mac users only)***
```bash
cd ios && pod install && cd ..
```

**Step 4 — Run the app**
```bash
# Android
npx react-native run-android

# iOS
npx react-native run-ios
```

---

### 🔥 Firebase Setup

```
1. 🌐  Go to → https://console.firebase.google.com/
2. ➕  Create a new project
3. ✅  Enable: Firestore | Authentication | Storage
4. 📥  Android → Download google-services.json → Place in android/app/
5. 📥  iOS     → Download GoogleService-Info.plist → Add to Xcode project
```

> 🔒 **Security Tip:** Never commit `google-services.json` or `GoogleService-Info.plist` to version control. Add them to your `.gitignore`.

---

## 📂 Project Structure

```text
alumni-connect/
│
├── 📱 android/               # Native Android code
├── 🍎 ios/                   # Native iOS code
│
├── 🗂️  src/                   # Main application source
│   ├── 🎨 assets/            # Fonts, images, icons
│   ├── 🧩 components/        # Reusable UI components
│   ├── 🧭 navigation/        # React Navigation routes
│   ├── 📄 screens/           # App screens (Feed, Directory…)
│   ├── 🔥 services/          # Firebase integration & APIs
│   └── 🔧 utils/             # Helper functions & constants
│
├── ⚡ App.js                 # Application entry point
└── 📦 package.json           # Dependencies & scripts
```

---

## 📦 Releases

<div align="center">

![Latest Release](https://img.shields.io/badge/latest-v1.0.0_MVP-FFD700?style=for-the-badge&logo=github&logoColor=black)
![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-blue?style=for-the-badge&logo=react&logoColor=white)

**👉 [View All Releases & Compiled Binaries](../../releases)**

*Or click the **Releases** section on the right sidebar on GitHub.*

</div>

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen?style=for-the-badge&logo=github)

1. Fork the project
2. Create your feature branch: `git checkout -b feature/AmazingFeature`
3. Commit your changes: `git commit -m 'Add some AmazingFeature'`
4. Push to the branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request 🚀

---

## 📄 License

Distributed under the **MIT License**.

![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge&logo=open-source-initiative)

See [`LICENSE`](./LICENSE) for full details.

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=1a1a1a,FFD700&height=120&section=footer&animation=fadeIn" width="100%"/>

<p>
  <code>// Designed with a cyber-editorial aesthetic.</code>
  <br/>
  <sub>Made with ❤️ by the Alumni Connect Team</sub>
</p>

![Visitors](https://visitor-badge.laobi.icu/badge?page_id=yuvrajshrirame.alumni-connect&style=flat-square&color=FFD700)
⭐ **Star this repo if you found it helpful!** ⭐

</div>
