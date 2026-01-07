# 🍌 BananaBread - Technion Degree Planner

> **The ultimate visual tool for planning your academic degree at the Technion.**

BananaBread is a modern, interactive web application designed to help Technion students plan their course schedules with ease. Forget about messy Excel sheets; visualize your entire degree, manage prerequisites, and track your progress in a beautiful, responsive interface.

---

## ✨ Key Features

* **🎓 Smart Track Loading**: Instantly load official degree tracks (e.g., Computer Science, Electrical Engineering, Medicine) directly from the catalog.
* **🖱️ Drag & Drop Interface**: Easily move courses between semesters to find the perfect balance for your schedule.
* **🔗 Visual Dependencies**:
    * **Prerequisite Lines**: Hover over a course to see its entire chain of prerequisites (ancestors) and the courses it blocks (descendants).
    * **Automatic Validation**: The app alerts you if you place a course before its prerequisites are met.
* **🌗 Dark Mode**: Fully supported dark theme for those late-night study sessions.
* **💾 Auto-Save**: Your progress is automatically saved to your browser's Local Storage. Close the tab and come back anytime; your plan will be waiting.
* **🎨 Faculty Color-Coding**: Courses are automatically colored based on their faculty (CS, Math, Physics, etc.) for quick visual recognition.
* **📊 Progress Tracking**: A live progress bar shows your completed credit points vs. the total degree requirement.
* **✏️ Customization**: Add custom courses, edit existing ones, or mark courses as "Completed" to update your status.

## 🚀 How to Get Started

No installation or complex build process is required! This project runs entirely in the browser using modern web technologies.

1.  **Clone or Download** this repository.
2.  **Open `index.html`** in your favorite web browser (Chrome, Edge, Firefox, Safari).
3.  **Start Planning**:
    * Click the **"מסלול" (Track)** button to load your specific degree program.
    * Drag courses to arrange them across semesters.
    * Click the **Sun/Moon** icon to toggle the theme.

## 🛠️ Technologies Used

* **React 18**: For a dynamic and responsive user interface.
* **Tailwind CSS**: For modern styling and dark mode support.
* **PapaParse**: For efficient CSV parsing of course catalogs and tracks.
* **Babel**: For in-browser JSX transformation (no Node.js build step required for local use).

## 📂 Project Structure

* `index.html`: The main entry point containing the app container and script imports.
* `app.js`: The core logic, state management, and main application component.
* `components.js`: Reusable UI components (CourseCard, TrackSelectionModal, etc.) and helper functions.
* `data.js`: Static data definitions (Icons, Faculty lists).
* `courses.csv` & `completeTrack.csv`: The data files containing the Technion course catalog and degree tracks.

## 🤝 Credits

Developed by Technion students for the community.
* **Version**: v24

---

*Enjoy planning with BananaBread! 🍞*
