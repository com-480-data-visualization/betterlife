# Project of Data Visualization (COM-480)

| Student's name    | SCIPER |
| ----------------- | ------ |
| Francesco La Rosa | 396622 |
| Nicholas Bunjamin | 396640 |
| Corvin Laube      | 405240 |

## 📋 Project Overview

This project presents an interactive visualization of the OECD Better Life Index, exploring various dimensions of well-being across different countries. The visualization allows users to discover patterns in quality of life indicators and understand how different factors contribute to overall well-being.

**🌐 Live Website:** https://com-480-data-visualization.github.io/betterlife

**📚 Project Documentation:**
- [Milestone 1 Report](./Reports/Milestone%201.md)
- [Milestone 2 Report](./Reports/Milestone%202%20Report.pdf)
- [Milestone 3 Process Book (PDF)](./Reports/Milestone%203%20ProcessBook.pdf)
- [Process Book (Web Version)](./process_book.html) - *Shorter interactive version available on the website*

**🎥 Project Video:** *[Video will be available here once uploaded]*

## 🚀 Technical Setup and Usage

This project is built using modern web technologies with Node.js for dependency management and Tailwind CSS for styling. The visualization is implemented in vanilla JavaScript with D3.js for data manipulation and interactive charts.

### Prerequisites

- **Node.js** (v14 or higher): Download from [nodejs.org](https://nodejs.org/)
- **npm** (included with Node.js)
- **Modern web browser** with JavaScript enabled

### 📦 Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/com-480-data-visualization/betterlife.git
   cd betterlife
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   This installs Tailwind CSS, PostCSS, and other development dependencies.

### 🏃‍♂️ Running the Project

#### Option 1: Quick Start (Recommended)
For the best experience, use a local HTTP server:

```bash
# Using Python 3 (recommended)
python3 -m http.server 8000

# Using Python 2 (if Python 3 is not available)
python -m SimpleHTTPServer 8000

# Using Node.js (if you have it installed globally)
npx http-server

# Using PHP (if available)
php -S localhost:8000
```

Then open your browser and navigate to:
- **Main visualization:** `http://localhost:8000/visualization.html`
- **Landing page:** `http://localhost:8000/index.html`
- **Process book:** `http://localhost:8000/process_book.html`

#### Option 2: Development with CSS Building
If you plan to modify the styling:

1. **Build and watch CSS:**
   ```bash
   npm run build-css
   ```
   This compiles Tailwind CSS and watches for changes.

2. **Run local server** (in a separate terminal):
   ```bash
   python3 -m http.server 8000
   ```

### 📁 Project Structure

```
betterlife/
├── 📄 index.html              # Landing page
├── 📄 visualization.html      # Main data visualization
├── 📄 process_book.html       # Process book page
├── 📁 Reports/                # Project milestone reports
│   ├── 📄 Milestone 1.md
│   ├── 📄 Milestone 2 Report.pdf
│   └── 📄 Milestone 3 ProcessBook.pdf
├── 📁 Dataset/                # Data files and preprocessing scripts
│   ├── 📄 Better_Life_Unfiltered.csv
│   ├── 📄 preprocess.py
│   └── 📊 data_viz.ipynb
├── 📄 Better_Life_Preprocessed.csv  # Main dataset for visualization
├── 📁 dist/                   # Compiled CSS output
│   └── 📄 output.css
├── 📁 SVGs/                   # Vector graphics assets
├── 📁 Sketches/               # Design sketches and wireframes
├── 🎨 style.css              # Custom CSS for visualization
├── 📜 script.js              # Main JavaScript functionality
├── 📜 dropdown.js            # Dropdown menu functionality
├── 📜 input.css              # Tailwind CSS source
├── ⚙️ package.json           # Node.js dependencies and scripts
├── ⚙️ tailwind.config.js     # Tailwind CSS configuration
└── ⚙️ postcss.config.js      # PostCSS configuration
```

## 🗃️ Data

The project uses the OECD Better Life Index dataset, which measures well-being across multiple dimensions:

- **Housing:** Affordability and overcrowding indicators
- **Income:** Household earnings and wealth distribution
- **Jobs:** Employment rates and job security
- **Community:** Social networks and civic engagement
- **Education:** Educational attainment and student skills
- **Environment:** Air quality and water quality
- **Safety:** Personal security and assault rates
- **Life Satisfaction:** Self-reported life satisfaction
- **Health:** Life expectancy and self-reported health
- **Work-Life Balance:** Time for leisure and personal care

### Data Processing

Raw data files are located in the `Dataset/` directory. The preprocessing pipeline:
1. **Raw data:** Multiple CSV files with different demographic breakdowns
2. **Processing:** `preprocess.py` cleans and aggregates the data
3. **Output:** `Better_Life_Preprocessed.csv` - the main dataset used by the visualization

**Note:** Due to file size constraints, large raw datasets are stored locally. The preprocessed data file is included in the repository.

## 🛠️ Technologies Used

- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Styling:** Tailwind CSS, Custom CSS
- **Data Visualization:** D3.js
- **Build Tools:** PostCSS, Autoprefixer
- **Data Processing:** Python (pandas, numpy)
- **Version Control:** Git, GitHub
- **Deployment:** GitHub Pages

## 🎯 Features

- **Interactive World Map:** Explore countries and their Better Life Index scores
- **Multi-dimensional Analysis:** Compare countries across different well-being indicators
- **Dynamic Filtering:** Filter and sort countries by various criteria
- **Story-driven Exploration:** Guided narratives through the data

## 🤝 Contributing

This project was developed as part of the COM-480 Data Visualization course. For questions or suggestions, please contact the project team.

## 📄 License

This project is for educational purposes as part of the COM-480 Data Visualization course at EPFL.

---

*Built with ❤️ for COM-480 Data Visualization*
