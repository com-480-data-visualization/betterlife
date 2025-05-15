const trigger = document.getElementById("dimension-trigger");
const options = document.getElementById("dimension-options");
const dimensionTitle = document.getElementById("dimension-title");
const dimensionDetail = document.getElementById("dimension-detail");
const detailTexts = {
  "Income and Wealth": "Income and wealth shape households' consumption possibilities. Income after taxes and transfers indicates what households have available to spend, while direct measures of household consumption expenditure inform about “realised” material conditions.",
  "Housing": "Housing provides shelter, safety, privacy and personal space. The area where people live also determines their access to many different services. Different aspects of housing conditions include the quality of housing, housing affordability, and the amenities and characteristics of neighbourhoods.",
  "Work and Job Quality": "Work refers to productive activity (whether paid or unpaid), and job quality is about both material and non-material aspects of people's working conditions. Material aspects of working conditions include issues such as remuneration (e.g. salary), the availability of jobs, and the risk of job loss. Non-material aspects relate to the quality of the working environment, measured through workers' self-reports about their physical safety, the content of their job, how well this matches their skills and abilities, the autonomy afforded, their learning opportunities, working time arrangements, and relationships with co-workers.",
  "Health": "Health is about being and feeling well: a long life unencumbered by physical or mental illness, and the ability to participate in activities that people value.",
  "Knowledge and Skills": "Knowledge and skills are about what people know and can do.",
  "Environmental Quality": "Environmental Quality affects human health through the quality of air, water and soil, which is related to the presence and density of hazardous substances. Environmental Quality also matters intrinsically to people who value natural beauty and the amenities that affect their life choices (e.g. a place to live). Finally, people benefit from environmental services and assets.",
  "Subjective Well-being": "Subjective Well-being is about good mental states, and how people experience their lives.",
  "Safety": "Safety is about freedom from harm, whether that harm comes in the form of crime, conflict, violence, terrorism, oppression, accidents or natural disasters.",
  "Work-Life Balance": "Work-Life Balance is about being able to combine family commitments, leisure, and work.",
  "Social Connections": "Social Connections capture the quantity of social interactions (e.g., frequency and amount of time individuals spend with household members, their family, friends, colleagues, and other known persons), their quality (e.g. satisfaction with social interactions, perceived loneliness), and the support (e.g. emotional and financial) provided by these connections.",
  "Civic Engagement": "Civic Engagement is about whether people can and do take part in a range of important civic activities that enable them to shape the society they live in.",
};

trigger.addEventListener("click", () => {
  const isOpen = options.classList.toggle("show");
  trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
});

document.querySelectorAll(".custom-option").forEach(option => {
  option.addEventListener("click", () => {
    const value = option.dataset.value;
    const label = option.textContent.trim();
    const icon = option.querySelector("img").src;

    trigger.innerHTML = `<img src="${icon}" alt="" class="custom-icon" /> ${label}`;
    options.classList.remove("show");
    trigger.setAttribute("aria-expanded", "false");

    // Update dimension display
    if (dimensionTitle) {
      dimensionTitle.textContent = label;
    }
    if (dimensionDetail) {
      const tmp = detailTexts[label];
      if (tmp){
        dimensionDetail.textContent = tmp;
      }
      else{
        dimensionDetail.textContent = "Category description not added yet...";
      }
    }
  });
});

// Closes the dropdown menu when clicking somewhere else
document.addEventListener("click", (e) => {
  if (!document.getElementById("dimension-select-wrapper").contains(e.target)) {
    options.classList.remove("show");
    trigger.setAttribute("aria-expanded", "false");
  }
});