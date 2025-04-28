/* eslint-env browser */
/* global d3, topojson */
"use strict";

/* -------------------------------------------------------------------------
 * Utility helpers
 * ---------------------------------------------------------------------- */
/**
 * Typed query-selector (returns HTMLElement or null).
 * @param {string} sel - The CSS selector.
 * @param {Document|Element} [scope=document] - The scope to search within.
 * @returns {HTMLElement|null} The found element or null.
 */
const qs = (sel, scope = document) =>
  /** @type {HTMLElement|null} */ (scope.querySelector(sel));

/**
 * Query selector all (NodeList → Array).
 * @param {string} sel - The CSS selector.
 * @param {Document|Element} [scope=document] - The scope to search within.
 * @returns {Array<Element>} An array of found elements.
 */
const qsa = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));

/**
 * Shortcut for document.getElementById.
 * @param {string} id - The element ID.
 * @returns {HTMLElement|null} The found element or null.
 */
const byId = (id) =>
  /** @type {HTMLElement|null} */ (document.getElementById(id));

/**
 * Debounces a function execution.
 * @template {function(...any): any} T
 * @param {T} fn - The function to debounce.
 * @param {number} [ms=100] - The debounce delay in milliseconds.
 * @returns {(...args: Parameters<T>) => void} The debounced function.
 */
const debounce = (fn, ms = 100) => {
  let t; // Timeout ID
  return (...a) => {
    clearTimeout(t);
    // Use an arrow function to preserve the `this` context if fn expects one,
    // although in current usage with arrow functions like `() => this.#redraw()`,
    // the `this` context is already captured lexically.
    t = setTimeout(() => fn.apply(this, a), ms);
  };
};

/* -------------------------------------------------------------------------
 * Configuration (frozen to prevent accidental modification)
 * ---------------------------------------------------------------------- */
const CONFIG = Object.freeze({
  debug: false, // Set to true for verbose logging
  ui: Object.freeze({
    containerId: "map-container",
    // IDs must match the HTML DOM structure
    ids: Object.freeze({
      dimensionSel: "dimension-select",
      yearSlider: "year-slider",
      yearDisplay: "year-display",
      dimensionTxt: "selected-dimension",
      yearTxt: "selected-year",
      countryTxt: "selected-country-display",
      countryInfo: "country-info",
      hideOthers: "hide-others-checkbox",
      playBtn: "play-pause-button",
      themeToggle: "theme-toggle",
      tooltip: "tooltip",
      miniDash: "mini-dashboard",
      legend: "legend",
    }),
  }),
  data: Object.freeze({
    topoUrl: "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json",
    csvUrl: "Better_Life_Preprocessed.csv", // Assumed to be relative or served locally
  }),
  colors: Object.freeze({
    // Uses CSS variables for theme compatibility
    targetDefault: "var(--color-map-target-fill, #ffffff)",
    otherDefault: "var(--color-map-default-fill, #e0e0e0)",
    hover: "var(--color-map-hover, #b3e5fc)",
    active: "var(--color-map-active, #4fc3f7)",
    background: "var(--color-map-bg, #e0f2fe)",
    graticule: "var(--color-map-graticule, #ccc)",
    border: "var(--color-map-border, #fff)",
    radarFill: "var(--color-radar-fill, #0ea5e988)",
    radarStroke: "var(--color-radar-stroke, #0284c7)",
    secondaryText: "var(--color-text-secondary, #bbb)",
  }),
  zoom: Object.freeze({
    initialScale: 1.1, // Initial map zoom level relative to base size
    scaleExtent: [0.7, 30], // Min/max zoom scale
    padding: 0.8, // Padding factor when zooming to a country (e.g., 0.8 means 80% of view)
    maxCountryScale: 12, // Max zoom scale specifically when clicking a country
    transitionMs: 750, // Duration for zoom transitions
  }),
  animation: Object.freeze({
    playMs: 1000, // Delay between year steps during playback
    colorMs: 250, // Duration for color/legend transitions
  }),
});

/** Centralised conditional logger based on CONFIG.debug flag. */
const log = (...args) => CONFIG.debug && console.debug("[OECD-Map]", ...args);

/* -------------------------------------------------------------------------
 * Domain & country name mappings and lists
 * ---------------------------------------------------------------------- */
/** Mapping from data dimension keys to human-readable labels. */
const DOMAIN_MAP = Object.freeze({
  income_wealth: "Income and wealth",
  housing: "Housing",
  work_job_quality: "Work and job quality",
  work_life_balance: "Work-life balance",
  health: "Health",
  knowledge_skills: "Knowledge and skills",
  social_connections: "Social connections",
  civic_engagement: "Civic engagement",
  environmental_quality: "Environmental quality",
  safety: "Safety",
  subjective_wellbeing: "Subjective well-being",
});

/** Corrections for country names between TopoJSON and CSV data. */
const COUNTRY_CORRECTIONS = Object.freeze({
  Slovakia: "Slovak Republic",
  "South Korea": "Korea",
  Turkey: "Türkiye",
  "United States of America": "United States",
});

/** Set of countries included in the OECD Better Life Index data (target countries). */
const TARGET_COUNTRIES = new Set([
  "Australia",
  "Austria",
  "Belgium",
  "Canada",
  "Chile",
  "Colombia",
  "Costa Rica",
  "Czech Republic",
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
  "Korea",
  "Latvia",
  "Lithuania",
  "Luxembourg",
  "Mexico",
  "Netherlands",
  "New Zealand",
  "Norway",
  "Poland",
  "Portugal",
  "Slovak Republic",
  "Slovenia",
  "Spain",
  "Sweden",
  "Switzerland",
  "Türkiye",
  "United Kingdom",
  "United States",
]);

/* -------------------------------------------------------------------------
 * Legend component (pure SVG)
 * Renders a continuous color legend for the map.
 * ---------------------------------------------------------------------- */
class ContinuousLegend {
  /** @type {d3.ScaleSequential<number,string>} D3 color scale */
  #scale;
  /** @type {d3.Selection<SVGSVGElement,unknown,null,undefined>} Parent SVG element */
  #svg;
  /** @type {d3.Selection<SVGGElement,unknown,null,undefined>} Root <g> element for the legend */
  #root;
  /** @type {string} Unique ID for the gradient definition */
  #gradientId = "legend-gradient";
  /** @type {number} Width of the legend bar */
  #width = 200;
  /** @type {number} Total height of the legend group */
  #height = 50;
  /** @type {number} Number of stops for the gradient */
  #gradientStops = 10;

  /**
   * Creates a ContinuousLegend instance.
   * @param {d3.ScaleSequential<number,string>} scale - The D3 sequential color scale to visualize.
   * @param {d3.Selection<SVGSVGElement,unknown,null,undefined>} svg - The parent D3 SVG selection to append the legend to.
   */
  constructor(scale, svg) {
    if (!scale || typeof scale !== "function") {
      throw new Error("ContinuousLegend requires a valid D3 scale function.");
    }
    if (!svg || !svg.node() || svg.node().tagName !== "svg") {
      throw new Error("ContinuousLegend requires a valid D3 SVG selection.");
    }
    this.#scale = scale;
    this.#svg = svg;
    this.#init();
  }

  /**
   * Initializes the legend SVG structure (group, defs, gradient, rect, axis).
   * @private
   */
  #init() {
    const legendHeight = this.#height;
    const legendId = CONFIG.ui.ids.legend; // Use ID from config

    this.#root = this.#svg
      .append("g")
      .attr("id", legendId)
      .attr("class", "map-legend")
      .style("opacity", 0) // Start hidden, fade in on first update
      .attr("aria-hidden", "true"); // Hide from screen readers initially

    // Gradient definition container
    const defs = this.#root.append("defs");

    // Linear gradient definition
    defs
      .append("linearGradient")
      .attr("id", this.#gradientId)
      .attr("x1", "0%") // Horizontal gradient
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    // Gradient rectangle bar
    this.#root
      .append("rect")
      .attr("x", 0)
      .attr("y", 10) // Position below top edge
      .attr("height", legendHeight - 30) // Bar height
      .attr("fill", `url(#${this.#gradientId})`); // Apply gradient fill

    // Axis group placeholder
    this.#root.append("g").attr("class", "legend-axis");
  }

  /**
   * Updates the legend's scale, gradient stops, and axis based on new min/max values.
   * @param {number} min - The minimum value of the current data domain.
   * @param {number} max - The maximum value of the current data domain.
   */
  update(min, max) {
    // Hide legend if data range is invalid
    if (![min, max].every((v) => Number.isFinite(v))) {
      this.#root.style("opacity", 0).attr("aria-hidden", "true");
      return;
    }

    // Adjust width dynamically based on available space (simple example)
    const availableWidth = window.innerWidth - 40; // Subtract padding
    const dynamicWidth = Math.max(150, Math.min(220, availableWidth));
    this.#width = dynamicWidth;
    this.#root.select("rect").attr("width", dynamicWidth);

    const stops = this.#gradientStops;
    const gradientSelection = this.#root.select(`#${this.#gradientId}`);

    // Update gradient stops
    gradientSelection.selectAll("stop").remove(); // Clear existing stops
    gradientSelection
      .selectAll("stop")
      .data(d3.range(stops + 1)) // Generate data for stops [0, 1, ..., stops]
      .enter()
      .append("stop")
      .attr("offset", (d) => `${(d / stops) * 100}%`) // Position stop
      .attr("stop-color", (d) => {
        // Calculate value at this stop position
        const value = min === max ? min : min + (max - min) * (d / stops);
        return this.#scale(value); // Get color from the scale
      });

    // Update axis
    const axisScale = d3
      .scaleLinear()
      .domain([min, max])
      .range([0, dynamicWidth]);
    const numTicks = Math.max(2, Math.min(5, Math.floor(dynamicWidth / 50))); // Dynamic ticks
    const axis = d3
      .axisBottom(axisScale)
      .ticks(numTicks)
      .tickFormat(d3.format(".2f")); // Format ticks to 2 decimal places

    this.#root
      .select(".legend-axis")
      .attr("transform", `translate(0, ${this.#height - 20})`) // Position axis below bar
      .transition()
      .duration(CONFIG.animation.colorMs) // Smooth transition
      .call(axis); // Render the axis

    // Fade in the legend if it was hidden
    this.#root.style("opacity", 1).attr("aria-hidden", "false");
  }

  /**
   * Repositions the legend group, typically called on window resize.
   * @param {number} svgHeight - The current height of the parent SVG container.
   */
  move(svgHeight) {
    // Position legend at bottom-left corner with padding
    this.#root.attr(
      "transform",
      `translate(20, ${svgHeight - this.#height - 10})` // (x padding, y position)
    );
  }
}

/* -------------------------------------------------------------------------
 * OECDWellbeingMap – Main application class
 * Orchestrates data loading, map rendering, UI interactions, and visualization updates.
 * ---------------------------------------------------------------------- */
class OECDWellbeingMap {
  /** @type {HTMLElement} Root container element */
  #root;
  /** @type {Object<string, HTMLElement|HTMLInputElement|HTMLSelectElement|HTMLButtonElement|null>} Cached UI elements */
  #$;
  /** @type {d3.Selection<SVGSVGElement, unknown, null, undefined> | null} Main SVG element */
  #svg = null;
  /** @type {d3.Selection<SVGGElement, unknown, null, undefined> | null} Main <g> element for map layers */
  #g = null;
  /** @type {ContinuousLegend | null} The map legend instance */
  #legend = null;
  /** @type {d3.GeoProjection | null} D3 map projection */
  #projection = null;
  /** @type {d3.GeoPathGenerator | null} D3 path generator for the projection */
  #path = null;
  /** @type {d3.ZoomBehavior<Element, unknown> | null} D3 zoom behavior */
  #zoomBehaviour = null;
  /** @type {d3.ScaleSequential<number, string>} D3 color scale for data values */
  #colorScale = d3.scaleSequential(d3.interpolateRdYlGn); // Default color scale
  /** @type {Map<string, number>} Stores CSV data: key = "Country_Domain_Year", value = score */
  #dataCsv = new Map();
  /** @type {Array<import('geojson').Feature>} Array of TopoJSON features */
  #features = [];
  /** @type {import('geojson').Feature | null} Currently selected country feature */
  #selected = null;
  /** @type {string} Currently selected dimension key (from DOMAIN_MAP) */
  #dimKey;
  /** @type {string} Currently selected year */
  #year;
  /** @type {d3.ZoomTransform} Current zoom transform */
  #currentTf = d3.zoomIdentity;
  /** @type {d3.ZoomTransform} Zoom transform before selecting a country (for reset) */
  #prevTf = d3.zoomIdentity;
  /** @type {number | null} Interval ID for playback animation */
  #playId = null;

  /**
   * Creates an OECDWellbeingMap instance.
   * @param {string} containerId - The ID of the HTML element to contain the map.
   */
  constructor(containerId) {
    this.#root = byId(containerId);
    if (!this.#root) {
      throw new Error(
        `Map container element with ID "${containerId}" not found.`
      );
    }

    // Cache references to UI elements defined in CONFIG
    const ids = CONFIG.ui.ids;
    this.#$ = {
      dimensionSel: /** @type {HTMLSelectElement} */ (byId(ids.dimensionSel)),
      yearSlider: /** @type {HTMLInputElement} */ (byId(ids.yearSlider)),
      yearDisplay: byId(ids.yearDisplay),
      dimensionTxt: byId(ids.dimensionTxt),
      yearTxt: byId(ids.yearTxt),
      countryTxt: byId(ids.countryTxt),
      info: byId(ids.countryInfo),
      hideOthers: /** @type {HTMLInputElement} */ (byId(ids.hideOthers)),
      playBtn: /** @type {HTMLButtonElement} */ (byId(ids.playBtn)),
      themeToggle: /** @type {HTMLButtonElement} */ (byId(ids.themeToggle)),
      tooltip: byId(ids.tooltip),
      miniDash: byId(ids.miniDash),
    };

    // Validate that essential UI elements were found
    for (const key in this.#$) {
      if (!this.#$[key]) {
        console.warn(`UI element with ID "${ids[key]}" not found.`);
        // Depending on severity, could throw an error or allow graceful degradation
      }
    }

    // Initial state setup
    this.#dimKey = this.#$.dimensionSel?.value ?? Object.keys(DOMAIN_MAP)[0]; // Default if select not found
    this.#year = this.#$.yearSlider?.value ?? "2022"; // Default if slider not found

    this.#applyThemePreference(); // Apply saved theme early
    this.#bootstrap(); // Start the loading and initialization process
  }

  /* ------------------------------------------------------------------ */
  /**
   * Asynchronous bootstrap process: Loads data, initializes SVG, renders map, attaches UI events.
   * @private
   */
  async #bootstrap() {
    try {
      log("Starting bootstrap process...");
      await this.#loadData();
      this.#initSvg();
      if (!this.#svg) throw new Error("SVG initialization failed."); // Guard against null SVG
      this.#legend = new ContinuousLegend(this.#colorScale, this.#svg);
      this.#renderCountries();
      this.#attachUi();
      this.#syncControls(); // Set initial UI text based on state
      this.#updateColours(); // Apply initial colors and update legend
      this.#inform(
        "Hover over an OECD country for info, click to zoom. Click the background to reset zoom."
      );

      // Debounced resize handler
      window.addEventListener(
        "resize",
        debounce(() => this.#redraw(), 150) // Use a slightly longer debounce for resize
      );
      log("Bootstrap complete.");
    } catch (err) {
      console.error("Fatal error during map initialization:", err);
      this.#root.innerHTML = `
        <p style="color:red; text-align:center; padding: 20px;">
          Could not initialize the map visualization. Please check the console for errors.
        </p>`;
    }
  }

  /* ------------------------------------------------------------------
   * Data Loading and Processing
   * ---------------------------------------------------------------- */
  /**
   * Loads TopoJSON geometry and CSV data, then parses them into internal structures.
   * @private
   * @throws {Error} If data loading or parsing fails.
   */
  async #loadData() {
    log("Loading TopoJSON & CSV data...");
    const [topoData, csvData] = await Promise.all([
      d3.json(CONFIG.data.topoUrl),
      d3.csv(CONFIG.data.csvUrl, d3.autoType), // d3.autoType attempts smart type conversion
    ]).catch((err) => {
      throw new Error(`Failed to load data resources: ${err.message}`);
    });

    // Validate TopoJSON structure
    if (!topoData?.objects?.countries) {
      throw new Error("Malformed TopoJSON data: Missing 'objects.countries'.");
    }
    // Validate CSV data (basic check)
    if (!Array.isArray(csvData)) {
      throw new Error("Failed to parse CSV data or CSV data is empty.");
    }

    // Convert TopoJSON to GeoJSON features, filtering for valid names
    this.#features = topojson
      .feature(topoData, topoData.objects.countries)
      .features.filter((f) => f?.properties?.name); // Ensure feature and name exist

    // Process CSV data into the lookup map
    this.#dataCsv.clear(); // Ensure map is empty before processing
    csvData.forEach((row) => {
      // Use optional chaining and nullish coalescing for safer access
      const area = row["Reference area"]?.trim();
      const domain = row["Domain"]?.trim();
      const year = row.TIME_PERIOD; // Already potentially typed by d3.autoType
      const value = row.mean_normalized_measure;

      // Basic validation of required fields
      if (!area || !domain || year == null) return; // Skip rows with missing key info

      const key = `${area}_${domain}_${year}`;
      // Ensure value is a finite number before storing
      if (Number.isFinite(value)) {
        this.#dataCsv.set(key, value);
      }
    });

    log(
      `Data loaded: ${this.#features.length} map features, ${
        this.#dataCsv.size
      } data points processed.`
    );
    if (this.#features.length === 0)
      console.warn("No map features were loaded.");
    if (this.#dataCsv.size === 0)
      console.warn("No data points were processed from CSV.");
  }

  /* ------------------------------------------------------------------
   * SVG Initialization and Setup
   * ---------------------------------------------------------------- */
  /**
   * Initializes the SVG container, projection, path generator, graticule, and zoom behavior.
   * @private
   * @throws {Error} If the root container has no size.
   */
  #initSvg() {
    const { clientWidth: width, clientHeight: height } = this.#root;
    if (!width || !height) {
      throw new Error("Map container has zero width or height.");
    }

    // Create SVG element
    this.#svg = d3
      .select(this.#root)
      .append("svg")
      .attr("width", "100%") // Use relative width
      .attr("height", "100%") // Use relative height
      .attr("viewBox", `0 0 ${width} ${height}`) // Maintain aspect ratio
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("role", "img") // ARIA role
      .attr("aria-label", "World map showing OECD Better Life Index data")
      .style("cursor", "grab") // Default cursor indicates panning possible
      .style("background-color", CONFIG.colors.background); // Set background via config

    // Create main group element for transformations (zoom/pan)
    this.#g = this.#svg.append("g");

    // Configure projection and path generator
    const baseScale = Math.min(width / (2 * Math.PI), height / Math.PI); // Basic scaling factor
    this.#projection = d3
      .geoMercator()
      .center([10, 40]) // Initial center coordinates
      .scale(baseScale * CONFIG.zoom.initialScale) // Apply initial zoom from config
      .translate([width / 2, height / 2]); // Center projection in the SVG

    this.#path = d3.geoPath(this.#projection); // Path generator for this projection

    // Add graticule (map lines)
    this.#g
      .append("path")
      .datum(d3.geoGraticule10()) // 10-degree graticule lines
      .attr("class", "graticule")
      .attr("d", this.#path)
      .attr("fill", "none")
      .attr("stroke", CONFIG.colors.graticule) // Use color from config
      .attr("stroke-width", 0.5) // Initial stroke width
      .style("pointer-events", "none") // Graticule shouldn't interfere with interactions
      .attr("vector-effect", "non-scaling-stroke"); // Keeps stroke width consistent on zoom

    // Configure zoom behavior
    this.#zoomBehaviour = d3
      .zoom()
      .scaleExtent(CONFIG.zoom.scaleExtent) // Set min/max zoom levels
      .filter((event) => {
        // Allow wheel/double-click zoom even when a country is selected,
        // but disable pan-dragging via filter when selected.
        // Panning is implicitly re-enabled on resetZoom via svg click handler.
        return this.#selected
          ? event.type === "wheel" || event.type === "dblclick"
          : true;
      })
      .on("zoom", (event) => this.#onZoom(event)); // Attach zoom event handler

    // Apply zoom behavior to SVG and add background click listener for reset
    this.#svg.call(this.#zoomBehaviour).on("click", (event) => {
      // Reset zoom only if clicking directly on the SVG or the main <g> background
      if (
        event.target === this.#svg.node() ||
        event.target === this.#g.node()
      ) {
        this.#resetZoom();
        this.#hideMiniDash(); // Also hide dashboard on background click
      }
    });
  }

  /* ------------------------------------------------------------------
   * Initial Map Rendering
   * ---------------------------------------------------------------- */
  /**
   * Renders the country features (paths) onto the map.
   * @private
   */
  #renderCountries() {
    if (!this.#g || !this.#path) return; // Ensure required elements exist

    this.#g
      .selectAll(".country")
      .data(this.#features, (feature) => feature.id ?? feature.properties.name) // Use unique ID for data binding
      .join("path") // D3 join pattern: enter, update, exit
      .attr("class", (feature) => this.#countryClass(feature)) // Assign CSS classes
      .attr("d", this.#path) // Generate path data using the geoPath generator
      .style("fill", (feature) => this.#initialFill(feature)) // Set initial fill color
      .attr("stroke", CONFIG.colors.border) // Country border color
      .attr("stroke-width", 0.5) // Initial border width
      .attr("vector-effect", "non-scaling-stroke") // Keep border width consistent on zoom
      .attr("aria-label", (feature) => feature.properties.name) // Accessibility label
      .attr("role", "button") // Semantically a button for interaction
      .attr(
        "tabindex",
        (
          feature // Make target countries focusable
        ) => (TARGET_COUNTRIES.has(this.#mapName(feature)) ? "0" : null)
      )
      // Attach event listeners for interaction
      .on("mouseover", (event, feature) => this.#onHover(event, feature))
      .on("mouseout", (event, feature) => this.#onHoverOut(event, feature))
      .on("click", (event, feature) => this.#onCountryClick(event, feature))
      .on("keydown", (event, feature) => {
        // Allow activation with Enter or Space key for accessibility
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault(); // Prevent default spacebar scroll
          this.#onCountryClick(event, feature);
        }
      });
  }

  /* ------------------------------------------------------------------
   * UI Event Handling Setup
   * ---------------------------------------------------------------- */
  /**
   * Attaches event listeners to UI controls (select, slider, buttons, checkbox).
   * @private
   */
  #attachUi() {
    const $ = this.#$; // Use cached elements

    // Dimension select change
    $.dimensionSel?.addEventListener("change", () => {
      this.#stopPlayback(); // Stop animation if running
      this.#dimKey = $.dimensionSel.value;
      this.#syncControls();
      this.#updateColours();
      // Re-render mini-dashboard if a country is selected
      if (this.#selected) this.#showMiniDash(this.#selected);
    });

    // Year slider input (fires continuously during drag)
    $.yearSlider?.addEventListener("input", () => {
      this.#stopPlayback(); // Stop animation if running
      this.#year = $.yearSlider.value;
      this.#syncControls();
      this.#updateColours();
      // Re-render mini-dashboard if a country is selected
      if (this.#selected) this.#showMiniDash(this.#selected);
    });

    // Hide non-target countries checkbox
    $.hideOthers?.addEventListener("change", () => {
      this.#toggleOthers(); // Update visibility of non-target countries
    });

    // Play/Pause button
    $.playBtn?.addEventListener("click", () => {
      this.#togglePlayback(); // Start or stop year animation
    });

    // Theme toggle button
    $.themeToggle?.addEventListener("click", () => {
      this.#toggleTheme(); // Switch between light/dark themes
    });

    // Set ARIA attributes for slider (min, max, current value)
    if ($.yearSlider) {
      $.yearSlider.setAttribute("aria-valuemin", $.yearSlider.min);
      $.yearSlider.setAttribute("aria-valuemax", $.yearSlider.max);
      // aria-valuenow is updated in #syncControls
    }
  }

  /* ------------------------------------------------------------------
   * Internal Helper Functions
   * ---------------------------------------------------------------- */
  /**
   * Maps a feature's name to the canonical name used in the CSV data, applying corrections.
   * @param {import('geojson').Feature} feature - The GeoJSON feature.
   * @returns {string} The potentially corrected country name.
   * @private
   */
  #mapName(feature) {
    const rawName = feature?.properties?.name ?? "";
    return COUNTRY_CORRECTIONS[rawName] ?? rawName; // Return corrected name or original
  }

  /**
   * Determines the CSS classes for a country path based on whether it's a target country.
   * @param {import('geojson').Feature} feature - The GeoJSON feature.
   * @returns {string} The CSS class string.
   * @private
   */
  #countryClass(feature) {
    const isTarget = TARGET_COUNTRIES.has(this.#mapName(feature));
    return isTarget ? "country target-country" : "country other-country";
  }

  /**
   * Determines the initial fill color for a country path.
   * @param {import('geojson').Feature} feature - The GeoJSON feature.
   * @returns {string} The fill color (from CONFIG).
   * @private
   */
  #initialFill(feature) {
    const isTarget = TARGET_COUNTRIES.has(this.#mapName(feature));
    return isTarget ? CONFIG.colors.targetDefault : CONFIG.colors.otherDefault;
  }

  /**
   * Updates the text content of UI display elements (year, dimension, selected country).
   * Also updates ARIA attributes for the slider.
   * @private
   */
  #syncControls() {
    const $ = this.#$;
    if (!$) return; // Exit if UI elements aren't cached

    const dimensionLabel =
      $.dimensionSel?.options[$.dimensionSel.selectedIndex]?.text ?? "N/A";
    const currentYear = this.#year ?? "N/A";
    const countryName = this.#selected?.properties?.name ?? "World View";

    // Update text displays
    if ($.yearDisplay) $.yearDisplay.textContent = currentYear;
    if ($.yearTxt) $.yearTxt.textContent = currentYear;
    if ($.dimensionTxt) $.dimensionTxt.textContent = dimensionLabel;
    if ($.countryTxt) $.countryTxt.textContent = countryName;

    // Update slider ARIA value
    if ($.yearSlider) $.yearSlider.setAttribute("aria-valuenow", currentYear);
  }

  /**
   * Displays an informational message to the user (e.g., in a status bar element).
   * Uses aria-live to announce changes to screen readers.
   * @param {string} msg - The message to display.
   * @private
   */
  #inform(msg) {
    if (this.#$.info) {
      this.#$.info.textContent = msg;
      // Make screen readers announce the message
      this.#$.info.setAttribute("aria-live", "polite");
      // Optional: Remove aria-live after a short delay to prevent repeated announcements if needed
      // setTimeout(() => this.#$.info?.removeAttribute('aria-live'), 1000);
    }
  }

  /**
   * Toggles the visibility of non-target countries based on the checkbox state.
   * @private
   */
  #toggleOthers() {
    if (!this.#g) return;
    const hide = this.#$.hideOthers?.checked ?? false;
    this.#g
      .selectAll(".country.other-country")
      .style("display", hide ? "none" : null) // Use null to revert to CSS default
      .attr("aria-hidden", hide ? "true" : "false"); // Update accessibility state
  }

  /* ------------------------------------------------------------------
   * Map Styling and Color Updates
   * ---------------------------------------------------------------- */
  /**
   * Updates the color scale domain based on current data, applies colors to target countries,
   * and updates the legend.
   * @private
   */
  #updateColours() {
    if (!this.#g || !this.#legend) return; // Ensure required elements exist

    const domainName = DOMAIN_MAP[this.#dimKey];
    if (!domainName) {
      console.warn(`Invalid dimension key: ${this.#dimKey}`);
      return; // Exit if the dimension key isn't valid
    }

    let minVal = Infinity;
    let maxVal = -Infinity;
    let hasFiniteData = false;

    // Find min/max values for the current dimension and year across target countries
    TARGET_COUNTRIES.forEach((countryName) => {
      const dataKey = `${countryName}_${domainName}_${this.#year}`;
      const value = this.#dataCsv.get(dataKey);
      if (Number.isFinite(value)) {
        hasFiniteData = true;
        if (value < minVal) minVal = value;
        if (value > maxVal) maxVal = value;
      }
    });

    // Adjust domain if no data found or if min/max are identical
    if (!hasFiniteData) {
      minVal = 0; // Default range if no data
      maxVal = 1;
    } else if (minVal === maxVal) {
      // Slightly expand range if all values are the same
      minVal = minVal > 0 ? minVal * 0.9 : -0.1;
      maxVal = maxVal > 0 ? maxVal * 1.1 : 0.1;
    }

    // Update the color scale's domain
    this.#colorScale.domain([minVal, maxVal]);

    // Apply colors to target countries based on the updated scale
    this.#g
      .selectAll(".country.target-country")
      .transition() // Smooth color transition
      .duration(CONFIG.animation.colorMs)
      .style("fill", (feature) => {
        const countryName = this.#mapName(feature);
        const dataKey = `${countryName}_${domainName}_${this.#year}`;
        const value = this.#dataCsv.get(dataKey);
        // Return color from scale if value exists, otherwise default target color
        return Number.isFinite(value)
          ? this.#colorScale(value)
          : CONFIG.colors.targetDefault;
      });

    // Update the legend with the new min/max values
    this.#legend.update(minVal, maxVal);
    // Ensure legend position is correct (might be needed after initial load/resize)
    if (this.#root) this.#legend.move(this.#root.clientHeight);
  }

  /* ------------------------------------------------------------------
   * Zoom and Pan Handling
   * ---------------------------------------------------------------- */
  /**
   * Handles the D3 zoom event, updating the main group's transform and adjusting stroke widths.
   * @param {d3.D3ZoomEvent<Element, unknown>} event - The D3 zoom event object.
   * @private
   */
  #onZoom(event) {
    if (!event.transform || !this.#g) return; // Exit if transform or group is missing

    this.#currentTf = event.transform; // Store the latest transform

    // Store the transform *before* selecting a country, so we can return to it
    if (!this.#selected) {
      this.#prevTf = this.#currentTf;
    }

    // Apply the transform to the main group
    this.#g.attr("transform", this.#currentTf.toString());

    // Adjust stroke widths based on zoom level for visual consistency
    this.#adjustStroke(this.#currentTf.k); // k is the scale factor
  }

  /**
   * Adjusts the stroke width of map features based on the current zoom scale factor.
   * @param {number} scaleFactor - The current zoom scale factor (k).
   * @private
   */
  #adjustStroke(scaleFactor) {
    if (!this.#g) return;
    // Calculate inverse scaled stroke width (makes strokes appear thinner when zoomed in)
    const countryStrokeWidth = 0.5 / scaleFactor;
    const graticuleStrokeWidth = 0.5 / scaleFactor;

    this.#g.selectAll(".country").style("stroke-width", countryStrokeWidth);
    this.#g.select(".graticule").style("stroke-width", graticuleStrokeWidth);
  }

  /* ------------------------------------------------------------------
   * Country Interaction (Hover, Click)
   * ---------------------------------------------------------------- */
  /**
   * Handles mouseover events on country paths: shows tooltip and highlights the country.
   * @param {MouseEvent} event - The mouse event.
   * @param {import('geojson').Feature} feature - The hovered feature.
   * @private
   */
  #onHover(event, feature) {
    const countryElement = d3.select(event.currentTarget);
    const mappedName = this.#mapName(feature);

    // Ignore hover on non-target countries or if the country is marked inactive (zoomed on another)
    if (
      !TARGET_COUNTRIES.has(mappedName) ||
      countryElement.classed("inactive")
    ) {
      return;
    }

    // --- Tooltip Logic ---
    const domainName = DOMAIN_MAP[this.#dimKey];
    const dataKey = `${mappedName}_${domainName}_${this.#year}`;
    const value = this.#dataCsv.get(dataKey);
    const scoreText = Number.isFinite(value) ? value.toFixed(2) : "N/A";
    const tooltipContent = `<strong>${feature.properties.name}</strong><br/>Score: ${scoreText}`;

    if (this.#$.tooltip) {
      this.#$.tooltip.innerHTML = tooltipContent;

      // Position tooltip near the cursor, constrained within viewport
      const tooltipPadding = 16;
      const { width: tooltipWidth, height: tooltipHeight } =
        this.#$.tooltip.getBoundingClientRect();
      let xPos = event.pageX + 15; // Default position: right of cursor
      let yPos = event.pageY - 10; // Default position: above cursor

      // Adjust if tooltip overflows viewport
      if (xPos + tooltipWidth + tooltipPadding > window.innerWidth) {
        xPos = event.pageX - tooltipWidth - 15; // Move to left of cursor
      }
      if (yPos + tooltipHeight + tooltipPadding > window.innerHeight) {
        yPos = event.pageY - tooltipHeight - 15; // Move further above cursor
      }
      // Ensure tooltip doesn't go off-screen left or top
      if (xPos < tooltipPadding) xPos = tooltipPadding;
      if (yPos < tooltipPadding) yPos = tooltipPadding;

      // Apply position and make visible
      Object.assign(this.#$.tooltip.style, {
        left: `${xPos}px`,
        top: `${yPos}px`,
        visibility: "visible",
        opacity: "1",
      });
    }

    // --- Highlight Logic ---
    // Only apply hover effect if no country is currently selected (active)
    if (!this.#selected) {
      countryElement.raise().style("fill", CONFIG.colors.hover); // Bring to front and apply hover color
      // Combine country name and score for the info box
      const infoText = `${feature.properties.name} | Score: ${scoreText}`; // Example format
      this.#inform(infoText);
    } else if (this.#selected === feature) {
      // If hovering over the *selected* country, update info message
      this.#inform(
        `Selected: ${feature.properties.name} (Click again or background to reset)`
      );
    }
  }

  /**
   * Handles mouseout events on country paths: hides tooltip and resets temporary styles.
   * @param {MouseEvent} event - The mouse event.
   * @param {import('geojson').Feature} feature - The feature being left.
   * @private
   */
  #onHoverOut(event, feature) {
    // Hide tooltip
    if (this.#$.tooltip) {
      this.#$.tooltip.style.visibility = "hidden";
      this.#$.tooltip.style.opacity = 0;
    }

    const countryElement = d3.select(event.currentTarget);
    const mappedName = this.#mapName(feature);

    // Ignore if not a target country or if it's the currently active/selected one
    if (!TARGET_COUNTRIES.has(mappedName) || countryElement.classed("active")) {
      return;
    }

    // Restore original fill color only if no country is selected
    if (!this.#selected) {
      const domainName = DOMAIN_MAP[this.#dimKey];
      const dataKey = `${mappedName}_${domainName}_${this.#year}`;
      const value = this.#dataCsv.get(dataKey);
      const originalColor = Number.isFinite(value)
        ? this.#colorScale(value)
        : CONFIG.colors.targetDefault;
      countryElement.style("fill", originalColor);
    }

    // Reset informational message based on selection state
    if (this.#selected) {
      this.#inform(
        `Selected: ${
          this.#selected.properties.name
        } (Click again or background to reset)`
      );
    } else {
      this.#inform(
        "Hover over an OECD country for info, click to zoom. Click the background to reset zoom."
      );
    }
  }

  /**
   * Handles click events on country paths: selects/deselects the country and triggers zoom.
   * @param {MouseEvent|KeyboardEvent} event - The click or keydown event.
   * @param {import('geojson').Feature} feature - The clicked feature.
   * @private
   */
  #onCountryClick(event, feature) {
    const mappedName = this.#mapName(feature);
    // Ignore clicks on non-target countries
    if (!TARGET_COUNTRIES.has(mappedName)) return;

    event.stopPropagation(); // Prevent click from bubbling up to SVG (which would reset zoom)
    this.#stopPlayback(); // Stop animation if running

    if (this.#selected === feature) {
      // Clicked on the already selected country: Deselect and reset zoom
      this.#resetZoom();
      this.#hideMiniDash();
    } else {
      // Clicked on a new target country: Select and zoom in
      // Store current transform *before* selecting, if nothing was selected yet
      if (!this.#selected) {
        this.#prevTf = this.#currentTf;
      }
      this.#selected = feature; // Set the new selected country
      this.#applyStyles(); // Update styles for active/inactive states
      this.#zoomTo(feature); // Zoom map to the selected country
      this.#syncControls(); // Update UI text (selected country name)
      this.#showMiniDash(feature); // Show the mini-dashboard for this country
    }
  }

  /**
   * Applies visual styles (active/inactive classes, pointer events) based on
   * the current selection state (`this.#selected`).
   * @private
   */
  #applyStyles() {
    if (!this.#g) return;
    const allCountries = this.#g.selectAll(".country");

    if (this.#selected) {
      // A country is selected
      const selectedName = this.#mapName(this.#selected);

      allCountries
        .classed("inactive", (d) => this.#mapName(d) !== selectedName) // Mark non-selected as inactive
        .classed("active", (d) => this.#mapName(d) === selectedName) // Mark selected as active
        .style(
          "pointer-events",
          (
            d // Disable pointer events for inactive countries
          ) => (this.#mapName(d) === selectedName ? "all" : "none")
        )
        .filter((d) => this.#mapName(d) === selectedName) // Select only the active country
        .style("fill", CONFIG.colors.active) // Apply active color
        .raise(); // Bring the active country to the front

      this.#svg?.style("cursor", "pointer"); // Change cursor to indicate clickable background/country
    } else {
      // No country is selected (resetting)
      allCountries
        .classed("inactive", false) // Remove inactive class
        .classed("active", false) // Remove active class
        .style("pointer-events", "all"); // Re-enable pointer events for all

      // Reapply colors based on data (important after deselection)
      this.#updateColours();

      this.#svg?.style("cursor", "grab"); // Change cursor back to grab (panning)
    }

    // Re-apply visibility rule for non-target countries after style changes
    this.#toggleOthers();
  }

  /* ------------------------------------------------------------------
   * Programmatic Zoom Control
   * ---------------------------------------------------------------- */
  /**
   * Zooms and pans the map to focus on the bounds of a given feature.
   * @param {import('geojson').Feature} feature - The feature to zoom to.
   * @private
   */
  #zoomTo(feature) {
    if (!this.#path || !this.#root || !this.#svg || !this.#zoomBehaviour)
      return;

    // Calculate the bounding box of the feature in projected coordinates
    const [[x0, y0], [x1, y1]] = this.#path.bounds(feature);
    const { clientWidth: width, clientHeight: height } = this.#root;

    const dx = x1 - x0;
    const dy = y1 - y0;

    // Handle cases where bounds are invalid (e.g., point feature)
    if (!dx || !dy) {
      log(
        "Cannot zoom to feature with zero dimensions:",
        feature.properties.name
      );
      return;
    }

    // Calculate desired scale, constrained by config settings
    const scale = Math.max(
      CONFIG.zoom.scaleExtent[0], // Ensure scale is not below minimum zoom
      Math.min(
        CONFIG.zoom.maxCountryScale, // Ensure scale does not exceed max country zoom
        CONFIG.zoom.padding * Math.min(width / dx, height / dy) // Calculate scale to fit bounds with padding
      )
    );

    // Calculate translation needed to center the feature's midpoint
    const translateX = width / 2 - (scale * (x0 + x1)) / 2;
    const translateY = height / 2 - (scale * (y0 + y1)) / 2;

    // Create the target zoom transform
    const targetTransform = d3.zoomIdentity
      .translate(translateX, translateY)
      .scale(scale);

    // Store the target transform as the new current transform
    this.#currentTf = targetTransform;

    // Animate the zoom transition
    this.#svg
      .transition()
      .duration(CONFIG.zoom.transitionMs)
      .call(this.#zoomBehaviour.transform, targetTransform); // Apply the transform via zoom behavior
  }

  /**
   * Resets the map zoom and selection state back to the previous view (before country selection).
   * @private
   */
  #resetZoom() {
    if (!this.#selected || !this.#svg || !this.#zoomBehaviour) {
      // Only reset if a country is actually selected
      return;
    }

    const previouslySelected = this.#selected; // Keep reference for style update
    this.#selected = null; // Clear selection state
    this.#currentTf = this.#prevTf; // Restore the previous transform state

    this.#svg
      .transition()
      .duration(CONFIG.zoom.transitionMs)
      .call(this.#zoomBehaviour.transform, this.#prevTf) // Animate back to previous transform
      .on("start", () => {
        // Optional: Apply some style changes immediately at start of transition
        // this.#applyStyles(); // Might cause flicker, applystyles on end is usually better
      })
      .on("end", () => {
        // Ensure styles are fully updated *after* the transition completes
        this.#applyStyles();
        this.#syncControls(); // Update UI text (back to 'World View')
        this.#inform(
          "Hover over an OECD country for info, click to zoom. Click the background to reset zoom."
        );
      });
  }

  /* ------------------------------------------------------------------
   * Mini Dashboard (Country Details)
   * ---------------------------------------------------------------- */
  /**
   * Hides the mini-dashboard panel and clears its content.
   * @private
   */
  #hideMiniDash() {
    if (this.#$.miniDash) {
      this.#$.miniDash.style.display = "none";
      this.#$.miniDash.innerHTML = ""; // Clear content
    }
  }

  /**
   * Shows the mini-dashboard panel and populates it with charts for the selected country.
   * Note: This currently regenerates the HTML content on each call. For complex dashboards,
   * a D3 data-binding approach might be more efficient.
   * @param {import('geojson').Feature} feature - The selected country feature.
   * @private
   */
  #showMiniDash(feature) {
    const countryName = this.#mapName(feature);
    const currentYear = this.#year;
    const dashElement = this.#$.miniDash;

    if (!dashElement) return; // Exit if dashboard element doesn't exist

    // --- Structure Setup ---
    // Clear previous content (simple approach; alternatives exist)
    dashElement.innerHTML = "";
    dashElement.style.display = "block"; // Make it visible

    // Add title
    dashElement.insertAdjacentHTML(
      "afterbegin",
      `<h4 class="mini-dashboard-title">${feature.properties.name} (${currentYear})</h4>`
    );

    // Create containers for the charts
    const sparklineContainer = document.createElement("div");
    sparklineContainer.className = "mini-chart-container";
    sparklineContainer.innerHTML = `<h5 class="mini-chart-title">${
      DOMAIN_MAP[this.#dimKey] // Use current dimension name
    } Trend</h5>`;

    const radarContainer = document.createElement("div");
    radarContainer.className = "mini-chart-container";
    radarContainer.innerHTML = `<h5 class="mini-chart-title">All Dimensions (${currentYear})</h5>`;

    // Append containers to the dashboard
    dashElement.append(sparklineContainer, radarContainer);

    // --- Render Charts ---
    // Call rendering functions, passing the container element and data parameters
    this.#renderSparkline(sparklineContainer, countryName, this.#dimKey);
    this.#renderRadar(radarContainer, countryName, currentYear);
  }

  /**
   * Renders a simple sparkline chart showing the trend for a specific dimension over the years.
   * @param {HTMLElement} containerElement - The HTML element to render the chart into.
   * @param {string} countryName - The name of the country.
   * @param {string} dimensionKey - The key of the dimension to display.
   * @private
   */
  #renderSparkline(containerElement, countryName, dimensionKey) {
    const domainName = DOMAIN_MAP[dimensionKey];
    if (!domainName || !this.#$.yearSlider) return; // Exit if dimension or slider is invalid

    // --- Constants ---
    const CHART_WIDTH = 220;
    const CHART_HEIGHT = 50;
    const MARGIN = 6; // Simple margin for aesthetics

    // --- Data Preparation ---
    const minYear = +this.#$.yearSlider.min;
    const maxYear = +this.#$.yearSlider.max;
    const years = d3.range(minYear, maxYear + 1); // Generate array of years

    const sparklineData = years
      .map((year) => ({
        year: year,
        value:
          this.#dataCsv.get(`${countryName}_${domainName}_${year}`) ?? null, // Get value or null
      }))
      .filter((d) => d.value !== null && Number.isFinite(d.value)); // Filter out missing/invalid data

    // Check if enough data exists to draw a line
    if (sparklineData.length < 2) {
      containerElement.innerHTML += `<p class="mini-chart-nodata">Not enough data for trend line.</p>`;
      return;
    }

    // --- Scales ---
    const xScale = d3
      .scaleLinear()
      .domain(d3.extent(sparklineData, (d) => d.year)) // Domain: min to max year in data
      .range([MARGIN, CHART_WIDTH - MARGIN]); // Range: chart width with margin

    const yScale = d3
      .scaleLinear()
      .domain(d3.extent(sparklineData, (d) => d.value)) // Domain: min to max value in data
      .nice() // Adjust domain to nice round values
      .range([CHART_HEIGHT - MARGIN, MARGIN]); // Range: chart height with margin (inverted for SVG coords)

    // --- SVG Rendering ---
    const svg = d3
      .select(containerElement)
      .append("svg")
      .attr("viewBox", `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("role", "img")
      .attr(
        "aria-label",
        `Sparkline chart showing ${domainName} trend for ${countryName}`
      );

    // Line generator
    const lineGenerator = d3
      .line()
      .x((d) => xScale(d.year))
      .y((d) => yScale(d.value));

    // Draw the line
    svg
      .append("path")
      .datum(sparklineData)
      .attr("fill", "none")
      .attr("stroke", "currentColor") // Use CSS color
      .attr("stroke-width", 1.5)
      .attr("d", lineGenerator);

    // Optional: Add points at start/end
    svg
      .selectAll(".spark-point")
      .data([sparklineData[0], sparklineData.at(-1)]) // First and last data points
      .join("circle")
      .attr("class", "spark-point")
      .attr("r", 2)
      .attr("cx", (d) => xScale(d.year))
      .attr("cy", (d) => yScale(d.value))
      .attr("fill", "currentColor");
  }

  /**
   * Renders a simple radar chart showing all dimension scores for a specific country and year.
   * @param {HTMLElement} containerElement - The HTML element to render the chart into.
   * @param {string} countryName - The name of the country.
   * @param {string} year - The selected year.
   * @private
   */
  #renderRadar(containerElement, countryName, year) {
    // --- Constants ---
    const CHART_WIDTH = 220;
    const CHART_HEIGHT = 180;
    const RADIUS = Math.min(CHART_WIDTH, CHART_HEIGHT) / 2 - 25; // Radius of the radar area
    const LABEL_OFFSET = 10; // Distance of labels from radar edge

    // --- Data Preparation ---
    const dimensionLabels = Object.values(DOMAIN_MAP);
    const dimensionValues = dimensionLabels.map(
      (domainName) =>
        // Get value or default to 0 if missing/invalid
        this.#dataCsv.get(`${countryName}_${domainName}_${year}`) ?? 0
    );

    // Check if any data exists
    if (!dimensionValues.some((value) => Number.isFinite(value) && value > 0)) {
      containerElement.innerHTML += `<p class="mini-chart-nodata">No data available for ${year}.</p>`;
      return;
    }

    // --- Scales ---
    // Angle scale: maps dimension index to angle
    const angleScale = d3
      .scaleLinear()
      .domain([0, dimensionLabels.length]) // Domain: 0 to number of dimensions
      .range([0, 2 * Math.PI]); // Range: 0 to 360 degrees (in radians)

    // Radius scale: maps data value (assuming 0-1 normalized) to pixel radius
    // Adjust domain if data is not normalized, e.g., d3.extent(dimensionValues)
    const radiusScale = d3
      .scaleLinear()
      .domain([0, 1]) // Assuming normalized data [0, 1]
      .range([0, RADIUS]); // Range: center to max radius

    // --- SVG Rendering ---
    const svg = d3
      .select(containerElement)
      .append("svg")
      .attr("viewBox", `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("role", "img")
      .attr(
        "aria-label",
        `Radar chart showing all dimensions for ${countryName} in ${year}`
      )
      .append("g")
      // Center the radar chart group within the SVG
      .attr("transform", `translate(${CHART_WIDTH / 2},${CHART_HEIGHT / 2})`);

    // --- Draw Axes and Labels ---
    dimensionLabels.forEach((label, index) => {
      const angle = angleScale(index);
      const x2 = Math.sin(angle) * RADIUS; // x endpoint of axis line
      const y2 = -Math.cos(angle) * RADIUS; // y endpoint of axis line (negative for SVG y-down)

      // Draw axis line from center to edge
      svg
        .append("line")
        .attr("x1", 0)
        .attr("y1", 0) // Start at center
        .attr("x2", x2)
        .attr("y2", y2) // End at radius edge
        .attr("stroke", CONFIG.colors.secondaryText)
        .attr("stroke-width", 0.5);

      // Draw axis label
      svg
        .append("text")
        .attr("x", Math.sin(angle) * (RADIUS + LABEL_OFFSET)) // Position label outside radius
        .attr("y", -Math.cos(angle) * (RADIUS + LABEL_OFFSET))
        .attr("font-size", "7px") // Small font size for labels
        .attr("text-anchor", (d, i) => {
          const angleDegrees = (angleScale(i) * 180) / Math.PI;
          // Adjust thresholds slightly to avoid perfect vertical/horizontal alignment issues
          if (angleDegrees > 10 && angleDegrees < 170) {
            return "start"; // Right side
          } else if (angleDegrees > 190 && angleDegrees < 350) {
            return "end"; // Left side
          }
          return "middle"; // Top or bottom
        })
        .attr("dominant-baseline", "middle") // Center text vertically
        // Replace hyphens with non-breaking hyphens and spaces with non-breaking spaces for better wrapping
        .text(label.replace(/-/g, "\u2011").replace(/ /g, "\u00A0"));
    });

    // --- Draw Data Polygon ---
    // Calculate polygon points [(x1, y1), (x2, y2), ...]
    const polygonPoints = dimensionValues.map((value, index) => {
      const angle = angleScale(index);
      const pointRadius = radiusScale(Math.max(0, value)); // Ensure radius is not negative
      const x = Math.sin(angle) * pointRadius;
      const y = -Math.cos(angle) * pointRadius;
      return [x, y];
    });

    // Draw the polygon connecting the points
    svg
      .append("polygon")
      .attr("points", polygonPoints.map((p) => p.join(",")).join(" ")) // Format points string "x1,y1 x2,y2 ..."
      .attr("fill", CONFIG.colors.radarFill) // Use fill color from config
      .attr("stroke", CONFIG.colors.radarStroke) // Use stroke color from config
      .attr("stroke-width", 1);
  }

  /* ------------------------------------------------------------------
   * Year Playback Animation
   * ---------------------------------------------------------------- */
  /**
   * Toggles the year playback animation on or off.
   * @private
   */
  #togglePlayback() {
    if (this.#playId) {
      this.#stopPlayback();
    } else {
      this.#startPlayback();
    }
  }

  /**
   * Starts the year playback animation using setInterval.
   * @private
   */
  #startPlayback() {
    if (this.#playId || !this.#$.playBtn || !this.#$.yearSlider) return; // Already playing or button missing

    // Update button state
    this.#$.playBtn.textContent = "Pause";
    this.#$.playBtn.setAttribute("aria-label", "Pause year animation");
    this.#$.playBtn.classList.add("playing");

    // If currently at the max year, reset to min year before starting
    const minYear = +this.#$.yearSlider.min;
    const maxYear = +this.#$.yearSlider.max;
    if (+this.#year >= maxYear) {
      this.#year = String(minYear);
      this.#$.yearSlider.value = this.#year;
      // Update immediately after reset
      this.#syncControls();
      this.#updateColours();
      if (this.#selected) this.#showMiniDash(this.#selected);
    }

    // Start the interval timer
    this.#playId = window.setInterval(() => {
      const currentNumericYear = +this.#year;
      const nextYear = currentNumericYear + 1;

      // Stop if the next year exceeds the maximum
      if (nextYear > maxYear) {
        this.#stopPlayback(); // Stop naturally at the end
        return;
      }

      // Update state and UI for the next year
      this.#year = String(nextYear);
      if (this.#$.yearSlider) this.#$.yearSlider.value = this.#year;

      // Call update functions directly to reflect the change
      this.#syncControls(); // Update text displays
      this.#updateColours(); // Update map colors and legend
      // Update the mini-dashboard if a country is selected
      if (this.#selected) this.#showMiniDash(this.#selected);
    }, CONFIG.animation.playMs); // Interval delay from config
  }

  /**
   * Stops the year playback animation by clearing the interval.
   * @private
   */
  #stopPlayback() {
    if (!this.#playId) return; // Not playing

    clearInterval(this.#playId); // Clear the interval timer
    this.#playId = null; // Reset the interval ID flag

    // Update button state
    if (this.#$.playBtn) {
      this.#$.playBtn.textContent = "Play";
      this.#$.playBtn.setAttribute("aria-label", "Play year animation");
      this.#$.playBtn.classList.remove("playing");
    }
  }

  /* ------------------------------------------------------------------
   * Theme Management
   * ---------------------------------------------------------------- */
  /**
   * Applies the theme (light/dark) based on localStorage preference.
   * @private
   */
  #applyThemePreference() {
    const savedTheme = localStorage.getItem("oecd-map-theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const isDark = savedTheme === "dark" || (!savedTheme && prefersDark);

    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
      if (this.#$.themeToggle) this.#$.themeToggle.textContent = "Light Mode";
    } else {
      document.documentElement.removeAttribute("data-theme");
      if (this.#$.themeToggle) this.#$.themeToggle.textContent = "Dark Mode";
    }
    // Note: Map background/stroke updates happen later or in #toggleTheme
  }

  /**
   * Toggles the theme between light and dark, updates localStorage, and refreshes relevant styles.
   * @private
   */
  #toggleTheme() {
    const isCurrentlyDark = document.documentElement.hasAttribute("data-theme");

    if (isCurrentlyDark) {
      // Switch to Light
      document.documentElement.removeAttribute("data-theme");
      localStorage.removeItem("oecd-map-theme");
      if (this.#$.themeToggle) this.#$.themeToggle.textContent = "Dark Mode";
    } else {
      // Switch to Dark
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("oecd-map-theme", "dark");
      if (this.#$.themeToggle) this.#$.themeToggle.textContent = "Light Mode";
    }

    // Re-apply styles that depend on CSS variables potentially changed by the theme
    if (this.#svg)
      this.#svg.style("background-color", CONFIG.colors.background);
    if (this.#g) {
      this.#g.select(".graticule").attr("stroke", CONFIG.colors.graticule);
      this.#g.selectAll(".country").attr("stroke", CONFIG.colors.border);
      // Re-color countries based on current data/selection as theme might affect default/active colors
      this.#applyStyles(); // This implicitly calls updateColours if nothing is selected
    }
    // Legend colors will update automatically if updateColours is called via applyStyles
    // If applyStyles doesn't run (e.g. no selection), explicitly update legend if needed
    if (!this.#selected) this.#updateColours();
  }

  /* ------------------------------------------------------------------
   * Responsive Resizing
   * ---------------------------------------------------------------- */
  /**
   * Handles window resize events: updates SVG viewBox, projection, paths, legend position,
   * and reapplies the current zoom transform.
   * @private
   */
  #redraw() {
    if (
      !this.#root ||
      !this.#svg ||
      !this.#projection ||
      !this.#path ||
      !this.#g ||
      !this.#legend ||
      !this.#zoomBehaviour
    ) {
      log("Redraw skipped, required elements not initialized.");
      return;
    }
    log("Redrawing map on resize...");

    const { clientWidth: width, clientHeight: height } = this.#root;
    if (!width || !height) return; // Skip if container collapsed

    // 1. Update SVG ViewBox
    this.#svg.attr("viewBox", `0 0 ${width} ${height}`);

    // 2. Update Projection (Scale and Translate)
    const baseScale = Math.min(width / (2 * Math.PI), height / Math.PI);
    this.#projection
      .scale(baseScale * CONFIG.zoom.initialScale)
      .translate([width / 2, height / 2]);

    // 3. Update Path Generator (though it references the projection directly)
    // this.#path.projection(this.#projection); // Redundant if projection object is mutated

    // 4. Redraw Paths
    this.#g.selectAll(".country").attr("d", this.#path);
    this.#g.select(".graticule").attr("d", this.#path);

    // 5. Reposition Legend
    this.#legend.move(height);

    // 6. Reapply Zoom
    // Re-apply the *current* zoom transform to maintain the zoom level/pan position
    this.#svg.call(this.#zoomBehaviour.transform, this.#currentTf);

    // 7. Adjust Strokes for Current (possibly unchanged) Zoom Level
    // Needed if the base stroke size depends on the initial render size,
    // or simply to ensure consistency after projection changes.
    this.#adjustStroke(this.#currentTf.k);
  }
}

/* -------------------------------------------------------------------------
 * Initialisation on DOM ready
 * Ensures the script runs after the HTML structure is available.
 * ---------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const containerId = CONFIG.ui.containerId;
  const containerElement = byId(containerId);

  // Check if essential libraries are loaded
  if (typeof d3 === "undefined" || typeof topojson === "undefined") {
    console.error("Error: D3.js or TopoJSON library not loaded.");
    if (containerElement) {
      containerElement.innerHTML = `
        <p style='color:red; text-align:center; padding: 20px;'>
          <strong>Error:</strong> Required JavaScript libraries (D3.js, TopoJSON) are missing or failed to load. Please check the script tags in your HTML file.
        </p>`;
    }
    return; // Stop execution
  }

  // Check if the main container element exists
  if (!containerElement) {
    console.error(
      `Error: Map container element with ID "${containerId}" not found in the DOM.`
    );
    // Optionally display an error message elsewhere if the container is missing
    return; // Stop execution
  }

  // Try to instantiate the map application
  try {
    log("DOM ready, initializing OECDWellbeingMap...");
    new OECDWellbeingMap(containerId);
    log("OECDWellbeingMap initialized successfully.");
  } catch (err) {
    console.error("Error during OECDWellbeingMap initialization:", err);
    containerElement.innerHTML = `
      <p style='color:red; text-align:center; padding: 20px;'>
        <strong>Error:</strong> Failed to initialize the map visualization. Details have been logged to the browser console.
      </p>`;
  }
});
