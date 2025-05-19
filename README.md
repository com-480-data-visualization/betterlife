# Project of Data Visualization (COM-480)

| Student's name    | SCIPER |
| ----------------- | ------ |
| Francesco La Rosa | 396622 |
| Nicholas Bunjamin | 396640 |
| Corvin Laube      | 405240 |

[Milestone 1](./Reports/Milestone%201.md) • [Milestone 2](./Reports/Milestone%202%20Report.pdf) • [Milestone 3](./Milestone3_ProcessBook.pdf)

Website: https://com-480-data-visualization.github.io/betterlife

## Technical Setup and Usage

This project uses Node.js and npm for managing dependencies and running build scripts. Tailwind CSS is used for styling and is compiled locally.

### Prerequisites

- **Node.js**: Make sure you have Node.js installed. You can download it from [nodejs.org](https://nodejs.org/). npm (Node Package Manager) is included with Node.js.

### Installation

1.  **Clone the repository (if you haven't already):**
    ```bash
    git clone https://github.com/com-480-data-visualization/betterlife.git
    cd betterlife
    ```

2.  **Install dependencies:**
    Navigate to the project directory in your terminal and run:
    ```bash
    npm install
    ```
    This will install Tailwind CSS, PostCSS, and other necessary development dependencies listed in `package.json`.

### Running the Project

1.  **Build and Watch CSS:**
    To compile the Tailwind CSS and watch for changes as you develop, run the following command in your terminal from the project root:
    ```bash
    npm run build-css
    ```
    This command will process `input.css`, apply Tailwind CSS transformations, and output the resulting stylesheet to `dist/output.css`. It will continue running and automatically rebuild the CSS when you save changes to your HTML files, `input.css`, or `tailwind.config.js`.

2.  **View in Browser:**
    -   **For `index.html` and `process_book.html`:** You can open these files directly in your web browser.
    -   **For `visualization.html` (Map Visualization):** This page loads data (e.g., `Better_Life_Preprocessed.csv`) and requires a local HTTP server due to browser security restrictions (CORS) when fetching local files.
        To run a simple local server using Python:
        1.  Open a new terminal window.
        2.  Navigate to the root directory of this project (`betterlife`).
        3.  Run the command:
            -   For Python 3: `python3 -m http.server`
            -   For Python 2: `python -m SimpleHTTPServer`
        4.  Open your browser and go to `http://localhost:8000/visualization.html` (or the port specified by the server, usually 8000).

    The `visualization.html` page itself uses `style.css` and does not depend on the Tailwind CSS build process for its own styling, but it does need the server for data loading.

### Project Structure

-   `index.html`: The main landing page.
-   `process_book.html`: The project's process book.
-   `visualization.html`: The main data visualization page (uses `style.css`).
-   `input.css`: The source file for Tailwind CSS directives.
-   `dist/output.css`: The compiled CSS output from Tailwind. This file is linked in `index.html` and `process_book.html`.
-   `tailwind.config.js`: Configuration file for Tailwind CSS.
-   `postcss.config.js`: Configuration file for PostCSS.
-   `package.json`: Lists project dependencies and scripts.
-   `.gitignore`: Specifies intentionally untracked files that Git should ignore.
-   `script.js`, `dropdown.js`: JavaScript files used by the HTML pages.
-   `style.css`: Custom CSS for `visualization.html`.
