/**
 * script.js
 * Handles the interactive map visualization for the OECD Well-being Prototype.
 * - Loads map data (world countries).
 * - Renders the map using D3.js.
 * - Handles user interactions: dimension/year selection, zooming/panning, country clicks.
 * - Updates the UI based on selections and interactions.
 * - Manages map state (zoom level, selected country).
 */

// --- Constants ---
// Configuration values used throughout the script.

/** @const {string} ID of the HTML div element where the map SVG will be placed. */
const MAP_CONTAINER_ID = "map-container";

/** @const {string} URL to fetch the TopoJSON data for world countries. */
const WORLD_MAP_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

/** @const {number} Initial map scale factor relative to container size. */
const INITIAL_SCALE = 1.1;

/** @const {Array<number>} Minimum and maximum allowed zoom scale factors. */
const ZOOM_SCALE_EXTENT = [0.7, 30];

/**
 * @const {number} Factor determining the padding around a country when zoomed in.
 * Lower value means more padding (more zoomed out relative to country size).
 */
const COUNTRY_ZOOM_SCALE_FACTOR = 0.8;

/** @const {number} Maximum zoom scale allowed when zooming into a single country. */
const MAX_COUNTRY_ZOOM = 12;

/** @const {number} Duration (in milliseconds) for zoom/pan transitions. */
const ZOOM_TRANSITION_DURATION = 750;

/** @const {number} Delay (in milliseconds) for debouncing resize events before redrawing the map. */
const RESIZE_DEBOUNCE_DELAY = 150;

// --- CSS Variable Fallbacks (used mainly if CSS variables fail or for logic checks) ---
// These primarily rely on the CSS :root definitions but provide fallbacks.
/** @const {string} Fill color for target countries (default: white). */
const TARGET_COUNTRY_FILL = "var(--color-map-target-fill, #ffffff)";
/** @const {string} Fill color for non-target countries (default: grey). */
const DEFAULT_COUNTRY_FILL = "var(--color-map-default-fill, #e0e0e0)";
/** @const {string} Fill color on hover for target countries. */
const HOVER_COUNTRY_FILL = "var(--color-map-hover, #b3e5fc)";
/** @const {string} Fill color for the selected target country. */
const ACTIVE_COUNTRY_FILL = "var(--color-map-active, #4fc3f7)";
/** @const {string} Fill color for the map's background rectangle. */
const MAP_BACKGROUND_FILL = "var(--color-map-bg, #e0f2fe)";

// --- Target Countries Data ---
/** @const {Array<string>} List of country names considered 'target' countries for interaction. */
const TARGET_COUNTRIES_LIST = [
  "Australia",
  "Austria",
  "Belgium",
  "Canada",
  "Chile",
  "Colombia",
  "Costa Rica",
  "Costa Rica",
  "Denmark",
  "Estonia",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Iceland",
  "Ireland",
  "Israel",
  "Italy",
  "Japan",
  "Latvia",
  "Lithuania",
  "Luxembourg",
  "Mexico",
  "Netherlands",
  "New Zealand",
  "Norway",
  "Poland",
  "Portugal",
  "Slovakia",
  "Slovenia",
  "South Korea", // Note: Name must match TopoJSON data exactly.
  "Spain",
  "Sweden",
  "Switzerland",
  "Turkey",
  "United Kingdom",
  "United States of America", // Note: Name must match TopoJSON data exactly.
];
/** @const {Set<string>} A Set created from the list for efficient O(1) lookups to check if a country is a target. */
const targetCountriesSet = new Set(TARGET_COUNTRIES_LIST);

// --- Global D3 & State Variables ---
// Variables that hold references to D3 objects or track the application's state.

/** @type {d3.Selection} Reference to the main SVG element containing the map. */
let svg;
/** @type {d3.Selection} Reference to the group element (<g>) within the SVG that holds map features (paths, graticule). */
let g;
/** @type {d3.GeoProjection} The D3 geographic projection used to translate coordinates to screen positions. */
let projection;
/** @type {d3.GeoPath} The D3 path generator used to draw geographic features (countries, graticule). */
let path;
/** @type {d3.ZoomBehavior} The D3 zoom behavior handler attached to the SVG. */
let zoom;
/** @type {number} Current width of the map container element. */
let width;
/** @type {number} Current height of the map container element. */
let height;
/** @type {Array<object>} Array containing the GeoJSON feature objects for all countries, loaded from TopoJSON. */
let countriesFeatures;
/** @type {object|null} Stores the GeoJSON feature object of the currently selected target country, or null if none selected. */
let selectedCountry = null;
/** @type {d3.ZoomTransform} Stores the current zoom/pan state (translation [x, y] and scale [k]). */
let currentTransform = d3.zoomIdentity; // Initial state: no translation, scale = 1
/** @type {d3.ZoomTransform} Stores the zoom/pan state *before* the last country was clicked. Used for resetting zoom. */
let previousTransform = d3.zoomIdentity;

// --- DOM Element References ---
// Caching references to frequently accessed DOM elements for performance.
/** @type {HTMLElement} The div element containing the map SVG. */
const mapContainer = document.getElementById(MAP_CONTAINER_ID);
/** @type {HTMLSelectElement} The dropdown menu for selecting the well-being dimension. */
const dimensionSelect = document.getElementById("dimension-select");
/** @type {HTMLInputElement} The range slider for selecting the year. */
const yearSlider = document.getElementById("year-slider");
/** @type {HTMLElement} The span element displaying the currently selected year near the slider. */
const yearDisplay = document.getElementById("year-display");
/** @type {HTMLElement} The span element in the controls displaying the selected dimension text. */
const selectedDimensionDisplay = document.getElementById("selected-dimension");
/** @type {HTMLElement} The span element in the controls displaying the selected year. */
const selectedYearDisplay = document.getElementById("selected-year");
/** @type {HTMLElement} The span element in the controls displaying the selected country name or "World View". */
const selectedCountryDisplay = document.getElementById(
  "selected-country-display"
);
/** @type {HTMLElement} The div element below the map displaying info/instructions. */
const countryInfo = document.getElementById("country-info");
/** @type {HTMLInputElement} The checkbox for toggling the visibility of non-target countries. */
const hideOthersCheckbox = document.getElementById("hide-others-checkbox");

// --- Control Update Logic ---

/**
 * Updates the text displays in the control panel (selection display area)
 * based on the current values of the dimension select, year slider, and selected country.
 * Also triggers the `updateMapColors` function (currently a placeholder).
 */
function updateDisplay() {
  // Get selected dimension text and value
  const selectedDimensionOption =
    dimensionSelect.options[dimensionSelect.selectedIndex];
  const selectedDimensionValue = selectedDimensionOption.value;
  const selectedDimensionText = selectedDimensionOption.text;
  // Get selected year
  const selectedYear = yearSlider.value;

  // Update text content of the display elements
  yearDisplay.textContent = selectedYear; // Update label next to slider
  selectedDimensionDisplay.textContent = selectedDimensionText;
  selectedYearDisplay.textContent = selectedYear;
  // Display the selected country's name or "World View" if none is selected
  selectedCountryDisplay.textContent = selectedCountry
    ? selectedCountry.properties?.name || "Unknown Country" // Use optional chaining for safety
    : "World View";

  // Placeholder: In a real application, this function would fetch/filter data
  // based on the selected dimension and year, then update the map visualization
  // (e.g., color countries based on data).
  updateMapColors(selectedDimensionValue, selectedYear);
}

// Map the data of the csv into d3.
let normalizedData = new Map();
d3.csv("./Dataset/Better_Life_Preprocessed.csv").then(data => {
  data.forEach(d => {
    const key = `${d["Reference area"]}_${d["Domain"]}_${d["TIME_PERIOD"]}`;
    normalizedData.set(key, +d["mean_normalized_measure"]);
  });
});

// Colour map for the values of the data.
function getColorFromValue(value) {
  if (value == null || isNaN(value)) return TARGET_COUNTRY_FILL;
  return d3.interpolateRgbBasis(["#ff0000", "#ffff00", "#00cc00"])(value);
}

/**
 * Placeholder function intended to update map colors based on selected data.
 * In this prototype, it mainly re-applies styles to ensure correct active/inactive states.
 * @param {string} dimension - The selected dimension value (e.g., 'health').
 * @param {string} year - The selected year (e.g., '2023').
 */
// function updateMapColors(dimension, year) {
//   console.log(
//     `Placeholder: Update map colors for dimension '${dimension}', year ${year}.`
//   );
//   // Ensure the map group element (g) exists before trying to select countries
//   if (!g) return;

//   // Re-apply CSS classes and styles to ensure everything is up-to-date
//   // This is important after data changes or selection changes.
//   applyCountryStyles();
// }

function updateMapColors(dimension, year) {
  if (!g || !normalizedData) return;

  g.selectAll(".country.target-country")
    .attr("fill", function (d) {
      const countryName = d.properties?.name;
      const key = `${countryName}_${dimension}_${year}`;
      const value = normalizedData.get(key);
      return getColorFromValue(value);
    });
}

/**
 * Toggles the visibility of non-target countries based on the checkbox state.
 * Uses CSS `display: none` to hide elements.
 */
function handleHideOthersToggle() {
  const isChecked = hideOthersCheckbox.checked; // Check if the checkbox is checked
  console.log("Hide others toggled:", isChecked);
  // Ensure the map group element (g) exists
  if (!g) return;

  // Select all country paths that have the 'other-country' class
  g.selectAll(".country.other-country")
    // Set the inline 'display' style: 'none' if checked, null (remove style) if unchecked
    .style("display", isChecked ? "none" : null);
}

// --- Attach Event Listeners to Controls ---
dimensionSelect.addEventListener("change", updateDisplay); // Update on dimension change
yearSlider.addEventListener("input", updateDisplay); // Update live as slider moves
hideOthersCheckbox.addEventListener("change", handleHideOthersToggle); // Update on checkbox change

// --- D3 Map Drawing Logic ---

/**
 * Initializes and draws the world map.
 * Sets up D3 projection, path generator, zoom behavior, loads geographic data,
 * renders countries and graticule, and handles window resizing.
 */
function drawMap() {
  /** @type {number} Timer ID for debouncing resize events. */
  let resizeTimer;

  /**
   * Handles the actual redrawing or updating of the map.
   * This function is called initially and on window resize (debounced).
   */
  const redrawMap = () => {
    // Clear any existing SVG content in the container (important for resize)
    d3.select(mapContainer).select("svg").remove();

    // Get the current dimensions of the map container element
    width = mapContainer.clientWidth;
    height = mapContainer.clientHeight;

    // If container has no dimensions (e.g., hidden), stop execution
    if (width <= 0 || height <= 0) return;

    // Create the main SVG element and append it to the map container
    svg = d3
      .select(mapContainer)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      // Use viewBox for responsive scaling; preserves aspect ratio
      .attr("viewBox", `0 0 ${width} ${height}`);

    // --- Set up Zoom Behavior ---
    zoom = d3
      .zoom()
      // Define the allowed range for zoom scale
      .scaleExtent(ZOOM_SCALE_EXTENT)
      // Register the event handler function for 'zoom' events
      .on("zoom", zoomed);

    // Apply the zoom behavior to the SVG element. This allows panning/zooming on the SVG.
    svg.call(zoom);

    // --- Add Background Rectangle ---
    // This rectangle covers the entire SVG background.
    // It serves two purposes:
    // 1. Provides a background color (set via CSS).
    // 2. Catches click events to trigger the `resetZoom` function.
    svg
      .append("rect")
      .attr("class", "background") // Assign class for potential styling/selection
      .attr("width", width)
      .attr("height", height)
      .attr("fill", MAP_BACKGROUND_FILL) // Use CSS variable for fill
      .style("pointer-events", "all") // Ensure it intercepts mouse events
      .on("click", resetZoom); // Attach click handler to reset zoom

    // --- Set up Map Projection ---
    // Defines how geographic coordinates (longitude, latitude) are mapped to 2D screen coordinates.
    projection = d3
      .geoMercator() // Using the Mercator projection
      // Set initial scale based on container size and INITIAL_SCALE factor
      .scale(Math.min(width / (2 * Math.PI), height / Math.PI) * INITIAL_SCALE)
      // Set the center of the map projection (longitude, latitude)
      .center([10, 50]) // Centered roughly on Europe
      // Translate the projection to center it within the SVG container
      .translate([width / 2, height / 2]);

    // --- Set up Path Generator ---
    // Takes GeoJSON geometry data and converts it into SVG path commands, using the defined projection.
    path = d3.geoPath().projection(projection);

    // --- Create Group for Map Elements ---
    // All map features (countries, graticule) will be appended to this group (<g>).
    // Applying zoom transformations to this group moves/scales all its children.
    g = svg.append("g");

    // --- Draw Graticule (Latitude/Longitude Lines) ---
    const graticule = d3.geoGraticule10(); // Generate graticule lines every 10 degrees
    g.append("path")
      .datum(graticule) // Bind the graticule data
      .attr("class", "graticule") // Assign class for styling
      .attr("d", path) // Generate the SVG path data using the path generator
      // Set initial stroke width, adjusted for the current zoom scale
      .style("stroke-width", `${0.5 / currentTransform.k}px`);

    // --- Apply Stored Transform ---
    // If the map is redrawn (e.g., on resize), re-apply the last known zoom/pan state.
    // This ensures the view remains consistent.
    svg.call(zoom.transform, currentTransform);

    // --- Load and Render Country Data ---
    // Check if country features have already been loaded
    if (!countriesFeatures) {
      console.log("Loading map data from:", WORLD_MAP_URL);
      // Fetch the TopoJSON data from the specified URL
      d3.json(WORLD_MAP_URL)
        .then((world) => {
          // --- Data Processing and Verification ---
          // Basic check for valid TopoJSON structure
          if (!world || !world.objects || !world.objects.countries) {
            throw new Error("Invalid TopoJSON data structure received.");
          }
          // Convert TopoJSON geometry to GeoJSON features
          countriesFeatures = topojson.feature(
            world,
            world.objects.countries
          ).features;
          // Filter out features that lack a name property (e.g., Antarctica in some datasets)
          countriesFeatures = countriesFeatures.filter(
            (d) => d.properties && d.properties.name
          );
          console.log("Map data loaded and processed successfully.");

          // --- Country Name Verification ---
          // Verify that the names in TARGET_COUNTRIES_LIST match names in the loaded map data.
          console.log("Verifying target country names against map data...");
          // 1. Create a Set of all unique country names found in the loaded GeoJSON data.
          const mapCountryNames = new Set(
            countriesFeatures.map((feature) => feature.properties.name)
          );
          console.log(
            `Found ${mapCountryNames.size} unique country names in the map data.`
          );

          // 2. Find target country names that are NOT present in the map data names.
          const missingFromMap = TARGET_COUNTRIES_LIST.filter(
            (targetName) => !mapCountryNames.has(targetName)
          );

          // 3. Report any discrepancies.
          if (missingFromMap.length > 0) {
            console.warn(
              "WARNING: The following target countries were NOT found in the map data:",
              missingFromMap
            );
            console.warn(
              "Check TARGET_COUNTRIES_LIST for typos or use exact names from the map data."
            );
          } else {
            console.log(
              "SUCCESS: All target countries were found in the map data."
            );
          }
          // Optional: Log countries present in map data but not in the target list (for info)
          const extraInMap = Array.from(mapCountryNames).filter(
            (mapName) => !targetCountriesSet.has(mapName)
          );
          if (extraInMap.length > 0) {
            console.info(
              `INFO: ${extraInMap.length} countries exist in map data but are not target countries.` // (Full list suppressed for brevity) // , extraInMap.sort());
            );
          }
          // --- End Country Name Verification ---

          // Render the countries using the processed and verified data
          renderCountries();
          // Update the control panel display now that data is available
          updateDisplay();
        }) // End of .then() for successful data loading
        .catch((error) => {
          // Handle errors during data fetching or processing
          console.error("Error loading or processing map data:", error);
          // Display an error message to the user in the map container
          mapContainer.innerHTML = `<p style='color: red; text-align: center; padding: 20px;'>Could not load map data. Please check console and network.</p>`;
        });
    } else {
      // If country data already exists (e.g., on resize), just re-render the countries
      renderCountries();
      // Re-apply active/inactive styles based on current selection
      applyCountryStyles();
      // Re-apply visibility based on checkbox state
      handleHideOthersToggle();
      // Ensure stroke widths are correct for the current zoom level
      updateStrokeWidths(currentTransform.k);
    }
  }; // End of redrawMap function definition

  /**
   * Renders the country paths onto the map group 'g'.
   * Uses the D3 data join pattern (`.data().join()`).
   * Assigns CSS classes ('country', 'target-country', 'other-country').
   * Attaches event listeners (mouseover, mouseout, click).
   */
  const renderCountries = () => {
    // Pre-condition check: ensure 'g' and 'countriesFeatures' are initialized
    if (!g || !countriesFeatures) {
      console.warn(
        "Attempted to render countries before 'g' or 'countriesFeatures' was ready."
      );
      return;
    }
    // Remove existing country paths before drawing new ones (important for redraws)
    g.selectAll(".country").remove();

    // D3 Data Join: Bind countriesFeatures data to path elements with class 'country'
    g.selectAll(".country")
      .data(countriesFeatures, (d) => d.id || d.properties.name) // Use unique ID or name as key
      .join("path") // Enter-Update-Exit pattern: creates/updates/removes paths as needed
      // Assign CSS classes based on whether the country is in the target set
      .attr("class", (d) => {
        const name = d.properties?.name; // Safely access the name property
        const isTarget = name ? targetCountriesSet.has(name) : false;
        return `country ${isTarget ? "target-country" : "other-country"}`;
      })
      // Generate the 'd' attribute (path data) using the geo path generator
      .attr("d", path)
      // Set initial fill color: White for target countries, null for others (CSS handles default)
      .attr("fill", (d) => {
        const name = d.properties?.name;
        return name && targetCountriesSet.has(name)
          ? TARGET_COUNTRY_FILL
          : null;
      })
      // Attach event listeners for interaction
      .on("mouseover", handleMouseOver) // Handle mouse entering a country path
      .on("mouseout", handleMouseOut) // Handle mouse leaving a country path
      .on("click", clicked); // Handle click on a country path

    // Apply initial active/inactive styles if a country is already selected
    applyCountryStyles();
    // Apply initial hide state based on the checkbox
    handleHideOthersToggle();
    // Ensure stroke widths match the current zoom level after rendering
    updateStrokeWidths(currentTransform.k);
  }; // End of renderCountries function definition

  // --- Initial Draw and Resize Handling ---
  // Perform the initial map draw
  redrawMap();

  // Add a resize event listener to the window
  window.addEventListener("resize", () => {
    // Debounce the resize event: wait RESIZE_DEBOUNCE_DELAY ms after the last resize event before redrawing
    clearTimeout(resizeTimer); // Clear any existing timer
    resizeTimer = setTimeout(redrawMap, RESIZE_DEBOUNCE_DELAY); // Set a new timer
  });
} // End of drawMap function

// --- D3 Zoom Event Handler ---

/**
 * Callback function executed when a D3 zoom event occurs (pan, wheel zoom, programmatic zoom).
 * Updates the transform of the main map group 'g' and adjusts stroke widths.
 * Prevents user-driven zoom/pan when a country is selected (map is locked).
 * @param {object} event - The D3 zoom event object. Contains `transform` and `sourceEvent`.
 */
function zoomed(event) {
  // Check if the zoom event was triggered by user interaction (mouse drag, wheel)
  // AND if a country is currently selected.
  if (event.sourceEvent && selectedCountry) {
    // If yes, prevent the user from changing the zoom/pan. Re-apply the fixed transform.
    svg.call(zoom.transform, currentTransform);
    return; // Stop further processing of this event
  }

  // Update the global `currentTransform` state based on the event source.
  if (event.sourceEvent) {
    // If triggered by user interaction, use the transform from the event.
    currentTransform = event.transform;
    // Only update `previousTransform` (used for reset) if the user is freely panning/zooming
    // (i.e., no country is selected).
    if (!selectedCountry) {
      previousTransform = currentTransform;
    }
  } else {
    // If triggered programmatically (e.g., by a transition `.call(zoom.transform, ...)`),
    // update `currentTransform` directly. We don't update `previousTransform` here because
    // programmatic zooms (like zooming to a country) shouldn't overwrite the state to reset to.
    currentTransform = event.transform;
  }

  // Apply the new transform (translation and scale) to the main map group 'g'.
  g.attr("transform", currentTransform);

  // Adjust the stroke widths of elements (like graticule) that need scaling inversely to zoom.
  updateStrokeWidths(currentTransform.k);
}

// --- Helper Functions ---

/**
 * Adjusts the stroke width of elements that should appear thinner when zoomed in
 * and thicker when zoomed out (e.g., graticule lines).
 * Country borders use `vector-effect: non-scaling-stroke` in CSS, so they don't need JS adjustment.
 * @param {number} scale - The current zoom scale factor (k) from the transform.
 */
function updateStrokeWidths(scale) {
  if (!g) return; // Ensure map group exists
  // Adjust graticule stroke width: Base width (0.5px) divided by the current scale.
  g.selectAll(".graticule").style("stroke-width", `${0.5 / scale}px`);
  // Note: Country stroke widths are handled by CSS `vector-effect: non-scaling-stroke`
  // and the `.active` class definition in CSS.
}

/**
 * Event handler for the 'mouseover' event on country paths.
 * Highlights the country if it's a target country and no other country is selected,
 * or provides context if hovering over the selected country.
 * Updates the country info text area.
 * @param {Event} event - The mouse event object.
 * @param {object} d - The GeoJSON feature data bound to the hovered element.
 */
function handleMouseOver(event, d) {
  const el = d3.select(event.currentTarget); // Select the path element that triggered the event

  // Ignore if the element is not a target country or if it's marked as inactive
  if (!el.classed("target-country") || el.classed("inactive")) {
    return;
  }

  const countryName = d.properties?.name || "Unknown";

  // Behavior depends on whether a country is currently selected
  if (!selectedCountry) {
    // --- No country selected ---
    // Raise the hovered element to the top layer (visual effect)
    el.raise();
    // Apply the hover fill color (defined in CSS variables)
    el.attr("fill", HOVER_COUNTRY_FILL);
    // Update the info text to show the hovered country's name
    countryInfo.textContent = `Country: ${countryName}`;
  } else if (selectedCountry === d) {
    // --- Hovering over the currently selected country ---
    // Update the info text to remind the user how to reset the view
    countryInfo.textContent = `Selected: ${countryName} (Click to return to previous view)`;
  }
  // Implicit else: Hovering over a non-selected target country while another *is* selected.
  // In this case, we do nothing (the non-selected country remains visually inactive).
}

/**
 * Event handler for the 'mouseout' event on country paths.
 * Reverts style changes applied on mouseover, unless the country is selected or inactive.
 * Resets the country info text area based on the current selection state.
 * @param {Event} event - The mouse event object.
 * @param {object} d - The GeoJSON feature data bound to the element the mouse left.
 */
function handleMouseOut(event, d) {
  const el = d3.select(event.currentTarget);

  // Ignore if the element is not a target country
  if (!el.classed("target-country")) {
    return;
  }

  // Only revert the fill color if the country is NOT inactive and NOT the active (selected) one.
  if (!el.classed("inactive") && !el.classed("active")) {
    // Revert fill to the default target country fill (white)
    el.attr("fill", TARGET_COUNTRY_FILL);
  }

  // Update the info text based on whether a country is currently selected
  if (selectedCountry) {
    // If a country is selected, show its name and reset instructions
    countryInfo.textContent = `Selected: ${
      selectedCountry.properties?.name || "Unknown"
    } (Click to return to previous view)`;
  } else {
    // If no country is selected, show the default instructions
    countryInfo.textContent =
      "Click a target country to zoom in. Click map background or selected country to return.";
  }
}

/**
 * Event handler for the 'click' event on country paths.
 * If a target country is clicked:
 * - If it's the currently selected country, reset the zoom (`resetZoom`).
 * - If it's a different target country, zoom in on it (`applyZoomTransition`).
 * If a non-target country is clicked, do nothing.
 * Stops event propagation to prevent the background click handler from firing.
 * @param {Event} event - The click event object.
 * @param {object} d - The GeoJSON feature data bound to the clicked element.
 */
function clicked(event, d) {
  const el = d3.select(event.currentTarget); // The clicked path element

  // --- Ignore clicks on non-target countries ---
  if (!el.classed("target-country")) {
    event.stopPropagation(); // Prevent the click from reaching the SVG background
    console.log("Clicked non-target country - ignored.");
    return; // Do nothing further
  }

  // Stop the event from propagating further (e.g., to the background rect)
  event.stopPropagation();

  // --- Handle clicks on target countries ---
  if (selectedCountry === d) {
    // Clicked on the *already selected* target country: Reset the view.
    console.log("Clicked selected country - Resetting zoom.");
    resetZoom();
  } else {
    // Clicked on a *new* target country: Zoom to this country.
    console.log(`Clicked new target country: ${d.properties?.name}`);

    // Before zooming to the new country, store the current transform *only if*
    // we were in the 'world view' (no country selected previously).
    // If another country *was* selected, `previousTransform` should already hold
    // the correct state to return to.
    if (!selectedCountry) {
      previousTransform = currentTransform;
    }

    // Update the global state to reflect the new selection
    selectedCountry = d;

    // Apply CSS classes to visually highlight the selected country and fade others
    applyCountryStyles();

    // Calculate and start the animated zoom transition to the selected country
    applyZoomTransition(d, ZOOM_TRANSITION_DURATION);

    // Update the control panel display (selected country name)
    updateDisplay();

    // Update the info text below the map
    countryInfo.textContent = `Selected: ${
      d.properties?.name || "Unknown"
    } (Click to return to previous view)`;

    // Change map cursor to indicate clicking again will reset
    svg.style("cursor", "pointer");
  }
}

/**
 * Calculates the required zoom transform (scale and translation) to center
 * and zoom in on the bounding box of a given GeoJSON feature (country).
 * Initiates an animated transition to this new transform.
 * @param {object} d - The GeoJSON feature object (country) to zoom to.
 * @param {number} duration - The duration of the zoom animation in milliseconds.
 */
function applyZoomTransition(d, duration) {
  // --- Pre-computation Checks ---
  // Ensure valid input data and map dimensions
  if (!d || !path || !width || !height || width <= 0 || height <= 0) {
    console.error("Cannot apply zoom: Invalid parameters or map dimensions.");
    return;
  }
  // Calculate the screen-space bounding box of the feature using the current projection
  const bounds = path.bounds(d);
  // Validate the calculated bounds
  if (
    !bounds ||
    !Number.isFinite(bounds[0][0]) ||
    !Number.isFinite(bounds[0][1]) ||
    !Number.isFinite(bounds[1][0]) ||
    !Number.isFinite(bounds[1][1])
  ) {
    console.warn(
      "Could not calculate valid bounds for country:",
      d.properties?.name,
      bounds
    );
    return; // Cannot proceed without valid bounds
  }

  // Extract coordinates from bounds: [[x0, y0], [x1, y1]]
  const [[x0, y0], [x1, y1]] = bounds;
  // Calculate width and height of the bounding box
  const dx = x1 - x0;
  const dy = y1 - y0;
  // Check for zero-dimension bounds (can happen with points or invalid geometry)
  if (dx <= 0 || dy <= 0) {
    console.warn(
      "Zero dimension bounds calculated for country:",
      d.properties?.name,
      { dx, dy }
    );
    return; // Cannot calculate scale with zero dimensions
  }

  // --- Calculate Target Transform ---
  // Calculate the center point of the bounding box
  const x = (x0 + x1) / 2;
  const y = (y0 + y1) / 2;
  // Calculate the desired scale factor:
  const scale = Math.max(
    ZOOM_SCALE_EXTENT[0], // Ensure scale is not less than the minimum allowed zoom
    Math.min(
      MAX_COUNTRY_ZOOM, // Ensure scale does not exceed the maximum country zoom
      // Calculate scale to fit bounds within viewport, applying padding factor
      COUNTRY_ZOOM_SCALE_FACTOR * Math.min(width / dx, height / dy)
    )
  );
  // Calculate the translation needed to center the feature's center point (x, y)
  // in the middle of the SVG container ([width / 2, height / 2]) at the calculated scale.
  const translate = [width / 2 - scale * x, height / 2 - scale * y];

  // Create the target D3 zoom transform object
  const targetTransform = d3.zoomIdentity
    .translate(translate[0], translate[1])
    .scale(scale);

  // Update the global `currentTransform` state immediately (reflects the target state)
  currentTransform = targetTransform;

  // --- Apply Animated Transition ---
  svg
    .transition() // Start a D3 transition
    .duration(duration) // Set the animation duration
    // Apply the target zoom transform smoothly over the duration
    .call(zoom.transform, targetTransform)
    // Optional: Add callbacks for transition end/interrupt
    .on("end", () => {
      console.log("Zoom transition ended.");
      // Ensure styles and stroke widths are correct after transition completes
      applyCountryStyles();
      updateStrokeWidths(currentTransform.k);
      svg.style("cursor", "pointer"); // Keep reset cursor
    })
    .on("interrupt", () => {
      console.log("Zoom transition interrupted.");
      // Ensure styles and stroke widths are correct if transition is interrupted
      applyCountryStyles();
      updateStrokeWidths(currentTransform.k);
    });
}

/**
 * Resets the map zoom/pan state to the `previousTransform` (the state before
 * the last country was clicked). Clears the `selectedCountry` state.
 * Initiates an animated transition back to the previous view.
 * Triggered by clicking the map background or the currently selected country.
 * @param {Event} [event] - The click event object (optional). Used to check target.
 */
function resetZoom(event) {
  // If triggered by an event, ensure it was a direct click on the background rectangle
  if (event && event.target !== svg.select(".background").node()) {
    return; // Ignore clicks on other elements (like non-target countries)
  }
  // Stop event propagation if triggered by an event
  if (event) {
    event.stopPropagation();
  }
  // If no country is currently selected, there's nothing to reset from
  if (!selectedCountry) {
    return;
  }

  console.log("Resetting Zoom to Previous State");

  // Clear the selection state
  selectedCountry = null;

  // The target transform for the reset is the state stored *before* the country was clicked
  const targetTransform = previousTransform;
  // Update the global `currentTransform` to reflect the target reset state
  currentTransform = targetTransform;

  // --- Apply Animated Reset Transition ---
  svg
    .transition()
    .duration(ZOOM_TRANSITION_DURATION)
    // Animate the zoom transform back to the target state
    .call(zoom.transform, targetTransform)
    // Define actions at the start of the transition
    .on("start", () => {
      // Apply styling changes immediately at the start
      applyCountryStyles(); // Reset active/inactive styles
      svg.style("cursor", "grab"); // Restore the default 'grab' cursor
    })
    // Define actions at the end of the transition
    .on("end", () => {
      console.log("Reset zoom transition ended.");
      // Update UI elements after transition completes
      updateDisplay(); // Update control panel display (show "World View")
      // Reset info text to default instructions
      countryInfo.textContent =
        "Click a target country to zoom in. Click map background or selected country to return.";
      // Ensure stroke widths are correct for the new zoom level
      updateStrokeWidths(currentTransform.k);
      // Re-apply styles just in case (belt-and-suspenders)
      applyCountryStyles();
      svg.style("cursor", "grab"); // Ensure grab cursor is set
    })
    // Define actions if the transition is interrupted
    .on("interrupt", () => {
      console.log("Reset zoom transition interrupted.");
      // Ensure the UI is in the correct final state even if interrupted
      updateDisplay();
      updateStrokeWidths(currentTransform.k);
      applyCountryStyles();
      svg.style("cursor", "grab");
    });

  // Update the control panel display immediately (don't wait for transition)
  updateDisplay();
}

/**
 * Applies 'active' and 'inactive' CSS classes to TARGET countries based on
 * the current `selectedCountry` state. Also manages `pointer-events` to
 * disable interaction with inactive countries. Ensures non-target countries
 * are not affected by these styles. Raises the active country visually.
 */
/**
 * Applies 'active' and 'inactive' CSS classes based on the current `selectedCountry` state.
 * When a country is selected:
 *   - The selected country gets the 'active' class.
 *   - ALL other countries (target and non-target) get the 'inactive' class.
 * When no country is selected (reset):
 *   - All countries have 'active' and 'inactive' classes removed.
 *   - Default styles (fill, pointer-events) are reapplied.
 * Manages pointer events and raises the active country visually.
 */
function applyCountryStyles() {
  if (!g) return; // Ensure map group exists

  // Select all country elements
  const allCountries = g.selectAll(".country");

  if (selectedCountry) {
    // --- A target country IS selected ---

    // 1. Initially, mark ALL countries as inactive
    allCountries
      .classed("inactive", true) // Add inactive class to all
      .classed("active", false) // Ensure active is removed from any previously active
      .style("pointer-events", "none"); // Disable pointer events for all

    // 2. Find the specifically selected country and override its styles
    const activeCountrySelection = allCountries
      .filter((d) => d === selectedCountry) // Filter to get only the selected country's element
      .classed("inactive", false) // REMOVE the inactive class
      .classed("active", true) // ADD the active class
      .style("pointer-events", "all"); // RE-ENABLE pointer events for the active one
    // Note: The fill color for the active country is primarily handled by the `.active` CSS rule.
    // We don't need to set it explicitly here unless overriding CSS.

    // 3. Raise the active country visually above others
    if (!activeCountrySelection.empty()) {
      activeCountrySelection.raise();
    }
  } else {
    // --- No country is selected (World View / Reset) ---

    // 1. Remove active/inactive classes from ALL countries
    allCountries
      .classed("active", false)
      .classed("inactive", false)
      // Reset pointer-events: null allows CSS defaults to take over
      // (pointer for target-country, default for other-country)
      .style("pointer-events", null)
      // 2. Explicitly reset fill colors based on country type
      .attr("fill", (d) => {
        const name = d.properties?.name;
        // If it's a target country, set fill to TARGET_COUNTRY_FILL (white).
        // Otherwise, set fill to null, letting the default CSS rule for
        // .country or .other-country apply (grey).
        return name && targetCountriesSet.has(name)
          ? TARGET_COUNTRY_FILL
          : null;
      });
  }
}

// --- Initial Setup ---
// Wait for the HTML document's structure to be fully loaded and parsed.
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Loaded. Initializing map...");
  // Set initial instruction text below the map
  countryInfo.textContent =
    "Click a target country to zoom in. Click map background or selected country to return.";
  // Call the main function to draw the map and set up interactions
  drawMap();
  // Note: `updateDisplay()` is initially called within `drawMap()` after data is loaded/verified.
});
