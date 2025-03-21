# Project of Data Visualization (COM-480)

| Student's name    | SCIPER |
| ----------------- | ------ |
| Francesco La Rosa | 396622 |
| Nicholas Bunjamin | 396640 |
| Corvin Laube      | 405240 |

[Milestone 1](#milestone-1) • [Milestone 2](#milestone-2) • [Milestone 3](#milestone-3)

## Milestone 1 (21st March, 5pm)

**10% of the final grade**

This is a preliminary milestone to let you set up goals for your final project and assess the feasibility of your ideas.
Please, fill the following sections about your project.

_(max. 2000 characters per section)_

### Dataset

We have selected the "OECD How’s Life?" database for our project. This database is an initiative by the Organisation for Economic Co-operation and Development (OECD) aimed at measuring well-being beyond GDP by comparing countries across multiple dimensions of quality of life. The dataset specifically focuses on 11 dimensions of current well-being, including Income and Wealth, Housing, Work and Job Quality, Health, Knowledge and Skills, Environmental Quality, Subjective Well-being, Safety, Work-Life Balance, Social Connections, and Civic Engagement. Each dimension is represented by multiple quantitative indicators, enabling comprehensive country profiles and detailed comparisons over a 20-year period (2004–2024).

The data originates from official OECD statistics and reputable national sources, ensuring high reliability and credibility. Approximately 80% of the indicators are regularly published by the OECD, with additional data sourced from internationally recognized institutions such as national statistical offices, United Nations Statistics, and the Gallup World Poll.

The "OECD How’s Life?" database covers all 38 OECD member countries, which predominantly include developed economies. While comprehensive within this scope, the dataset notably excludes most developing countries, given its OECD-centered focus. Nevertheless, the countries represented provide robust insights into diverse economic, social, and governance contexts for comparative analyses of well-being.

The dataset is rigorously maintained by OECD experts, ensuring completeness, accuracy, and consistency. It is openly accessible through OECD’s dedicated data portals and is exportable in widely used formats such as CSV and JSON. Due to its careful curation, the dataset requires minimal preprocessing or data cleaning, making it particularly suitable for robust research and analytical purposes.

Dataset available at: [How’s Life? database](https://data-explorer.oecd.org/vis?fs[0]=Topic%2C1%7CSociety%23SOC%23%7CWell-being%20and%20beyond%20GDP%23SOC_WEL%23&pg=0&fc=Topic&bp=true&snb=26&df[ds]=dsDisseminateFinalDMZ&df[id]=DSD_HSL%40DF_HSL_CWB&df[ag]=OECD.WISE.WDP&df[vs]=1.1&dq=.11_2%2B11_1%2B9_3%2B9_2%2B8_2%2B8_1_DEP%2B7_2%2B7_1_DEP%2B6_2_DEP%2B6_2%2B5_3%2B5_1%2B4_3%2B4_1%2B3_2%2B3_1%2B2_7%2B2_2%2B2_1%2B1_3%2B1_2%2B1_1.._T._T._T.&lom=LASTNOBSERVATIONS&lo=1&pd=%2C&to[TIME_PERIOD]=false)

### Problematic

Our visualization aims to clearly illustrate and explore how OECD countries compare with each other across the 11 dimensions of current well-being defined by the "OECD How’s Life?" database. Through this project, we seek to reveal nuanced insights into each country’s strengths, weaknesses, and overall performance in improving citizens’ quality of life beyond traditional economic indicators like GDP.

One primary axis of exploration will be spatial comparison: a dynamic, interactive geographical map will allow users to select and adjust views according to specific well-being dimensions, such as Health, Work-Life Balance, Environmental Quality, or Social Connections. By leveraging this visual tool, users can intuitively observe regional patterns, identify clusters of high-performing or struggling countries, and quickly perceive contrasts and similarities across multiple dimensions.

In addition to geographical comparisons, our project incorporates a temporal dimension. An interactive time slider will enable users to examine how each country’s well-being has evolved over the last 20 years (2004–2024). This will facilitate the discovery of trends, turning points, or policy impacts that may have influenced countries’ well-being trajectories, providing deeper insights into both the progress and regressions observed over time.

The motivation behind this visualization stems from recognizing the limitations of GDP as the dominant measure of progress and wanting to highlight broader societal conditions that influence quality of life. By creating an engaging, accessible, and interactive tool, our project targets a general audience, particularly individuals interested in public policy, international development, social science, or simply curious citizens who seek an intuitive understanding of complex socio-economic issues.

### Exploratory Data Analysis

The dataset consists of 11 main categories: Wealth, Employment, Housing, Free Time, Health, Education, Social Environment, Political Say, Natural Environment, Crime and General Satisfaction. All those categories are further divided into subcategories.

The data is collected from 38 countries including many European countries, North America, Oceania, some countries of Central America and few in Asia. There is no data of African countries. All the data was collected between 2004 and 2024.

In total there are 89713 data points with the distribution as shown in the following histogram. For the year 2024 there are only 18 data points which is why there seems to be no data.

![Histogram of data points per year](data_per_year.png)

To start with a classic example, we have the median net wealth by country. As not all countries have measured this in the same year, we have taken the most recent year of each country which are all close to each other.

![Histogram of Median net wealth by country](net_wealth.png)

As expected, Luxembourg is on the first place by far. Interestingly, Denmark and Latvia are on the last places even behind Chile.

If we compare this to the mean score of the highest quintile of life satisfaction, we can see that for the 3 countries mentioned before, median net wealth does not correlate with top quintile life satisfaction.

![Histogram of Top life satisfaction scores quintile by country](top_life_satisf.png)

### Related work

OECD themselves have made multiple different visualizations for their own data, such as an interactive dashboard allowing users to weigh 11 well-being dimensions, a mapping of BLI indicators geographically, and many different charts. Researchers have leveraged OECD BLI data to analyze well-being through composite indicators, regression models, and multivariate techniques, often linking metrics to economic equity or development. Some have reimagined aggregation methods such as hierarchical weighting to align with public priorities.

We plan on using OECD's own visualizations as a source of inspiration for our project. In particular, the interactive dashboard allows users to generate their own personalized rankings of country performance. We believe that this style of user-driven storytelling will be good to capture users' attention. In addition, their use of flowers to visualize the 11 well-being dimensions allows them to simplify the multivariate data without losing nuance. The geographic mapping of BLI indicators also offers a spatial lens to compare outcomes. These qualities are things we wish to emulate in our project. By blending modular interactivity and intuitive visual metaphors, we aim to empower users to explore well-being trends through their own priorities, in order to balance clarity with depth. None of us have used this dataset before in any previous works or personal projects.

Our approach is original in two ways. This combination of accessible visuals and longitudinal analysis empowers users to explore how priorities and policies shape well-being over time.

1. **Visual simplicity**: We replace complex metaphors (e.g., OECD’s flower charts) with intuitive geometric shapes and sizes to simplify multivariate data without sacrificing nuance.
2. **Temporal exploration**: We add a time-slider feature to compare well-being trends across all years, a gap in existing tools that focus on static snapshots.

## Milestone 2 (18th April, 5pm)

**10% of the final grade**

## Milestone 3 (30th May, 5pm)

**80% of the final grade**

## Late policy

- < 24h: 80% of the grade for the milestone
- < 48h: 70% of the grade for the milestone
