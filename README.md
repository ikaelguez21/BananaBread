<div align="center">

  <img src="bananaBreadLogo.png" alt="BananaBread Logo" width="120" />

  # 🍌 BananaBread
  
  **The Modern Academic Degree Planner for Technion Students**
  
  <p>
    <a href="#-key-features">Features</a> •
    <a href="#-tech-stack">Tech Stack</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#-credits">Credits</a>
  </p>

  ![License](https://img.shields.io/badge/License-MIT-blue.svg)
  ![Version](https://img.shields.io/badge/Version-v24-green.svg)
  ![Status](https://img.shields.io/badge/Status-Active-success.svg)

</div>

---

### 🧐 What is BananaBread?

**BananaBread** is a sleek, browser-based interactive tool designed to revolutionize how students plan their academic path. Forget clunky spreadsheets and manual prerequisite checking. BananaBread visualizes your entire degree, tracks your progress, and ensures you never miss a prerequisite again.

It runs entirely in your browser with **no installation required**.

---

### ✨ Key Features

| Feature | Description |
| :--- | :--- |
| **🎓 Smart Tracks** | Instantly load official degree tracks (CS, Medicine, Engineering, etc.) directly from Technion catalogs. |
| **🖱️ Drag & Drop** | Effortlessly drag courses between semesters to craft your perfect schedule. |
| **🔗 Visual Dependencies** | **Dynamic connecting lines** visualize course prerequisites and blocking chains in real-time. |
| **🧠 Intelligent Logic** | Automatic validation checks for prerequisites (ancestors) and alerts you to errors instantly. |
| **🌗 Dark Mode** | A beautiful, fully integrated Dark Mode for those late-night planning sessions. |
| **💾 Auto-Save** | Your plan is saved locally to your browser. Close the tab and pick up right where you left off. |
| **📊 Live Stats** | Real-time progress bar tracking your completed credit points against degree requirements. |
| **🎨 Faculty Coding** | Courses are color-coded by faculty (e.g., CS is Emerald, Physics is Violet) for instant recognition. |

---

### 🛠 Tech Stack

BananaBread is built with modern web technologies, focusing on performance and simplicity (no build step required!).

* ![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) **Core Framework**
* ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white) **Styling & Dark Mode**
* ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black) **ES6+ Logic**
* ![PapaParse](https://img.shields.io/badge/PapaParse-CSV-orange?style=for-the-badge) **Data Parsing**
* ![Babel](https://img.shields.io/badge/Babel-Standalone-yellow?style=for-the-badge) **In-Browser JSX**

---

### 🚀 Getting Started

You don't need `npm`, `yarn`, or a local server. BananaBread works right out of the box!

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/ikaelguez21/bananabread.git](https://github.com/ikaelguez21/bananabread.git)
    ```
2.  **Navigate to the folder:**
    ```bash
    cd BananaBread-main
    ```
3.  **Launch:**
    Double-click `index.html` to open it in your favorite browser (Chrome, Edge, Firefox, Safari).

---

### 📸 Screenshots

> *Add screenshots of your application here to show off the Light/Dark mode and the dependency graph!*

<div align="center">
  <br />
  <b>🌗 Toggle between Light and Dark themes instantly</b>
  <br />
</div>

---

### 📂 Project Structure

* `index.html` - The entry point and app container.
* `app.js` - Main application logic, state management, and effects.
* `components.js` - Reusable React components (CourseCard, Modal).
* `data.js` - Static icons and faculty definitions.
* `courses.csv` - The complete course catalog database.
* `completeTrack.csv` - Definitions for various degree tracks.

---

### 🤝 Credits & Contribution

Built with ❤️ by Technion students for the community.

* **Icons:** [Lucide React](https://lucide.dev/) (embedded via `data.js`)
* **Data:** Technion Course Catalog

Feel free to fork this repository and submit Pull Requests to add new features or fix bugs!

---

<div align="center">
  <sub>Enjoy planning with 🍌 BananaBread!</sub>
</div>
