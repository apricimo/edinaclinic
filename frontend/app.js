
const STATE_OPTIONS = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
];

const API_BASE = window.__API_BASE__ || "";

const state = {
  services: [],
  providers: [],
  availabilityCache: new Map(),
  appointments: [],
  booking: {
    selectedState: "MN",
    selectedService: null,
    selectedSlot: null
  },
  adminFilters: {
    service: "",
    provider: "",
    status: "",
    start: "",
    end: ""
  },
  providerTab: {
    selectedProviderId: ""
  }
};

const elements = {
  tabs: document.querySelectorAll("nav.tabs button"),
  panels: {
    booking: document.getElementById("tab-booking"),
    admin: document.getElementById("tab-admin"),
    providers: document.getElementById("tab-providers")
  },
  booking: {
    stateSelect: document.getElementById("booking-state"),
    serviceChips: document.getElementById("booking-services"),
    timesContainer: document.getElementById("booking-times"),
    providerSelect: document.getElementById("booking-provider"),
    form: document.getElementById("booking-form"),
    nameInput: document.getElementById("patient-name"),
    emailInput: document.getElementById("patient-email"),
    phoneInput: document.getElementById("patient-phone"),
    consentCheckbox: document.getElementById("sms-consent"),
    confirmation: document.getElementById("booking-confirmation")
  },
  admin: {
    serviceForm: document.getElementById("service-form"),
    serviceName: document.getElementById("service-name"),
    servicePrice: document.getElementById("service-price"),
    serviceDuration: document.getElementById("service-duration"),
    serviceStates: document.getElementById("service-states"),
    serviceActive: document.getElementById("service-active"),
    servicesTable: document.getElementById("services-table"),
    serviceError: document.querySelector('[data-error="service-table"]'),
    providerForm: document.getElementById("admin-provider-form"),
    providerName: document.getElementById("admin-provider-name"),
    providerEmail: document.getElementById("admin-provider-email"),
    providerPhone: document.getElementById("admin-provider-phone"),
    providerPriority: document.getElementById("admin-provider-priority"),
    providerStates: document.getElementById("admin-provider-states"),
    providerServices: document.getElementById("admin-provider-services"),
    providerActive: document.getElementById("admin-provider-active"),
    providersList: document.getElementById("admin-providers-list"),
    appointmentsTable: document.getElementById("appointments-table"),
    appointmentsEmpty: document.getElementById("appointments-empty"),
    filterService: document.getElementById("appointments-filter-service"),
    filterProvider: document.getElementById("appointments-filter-provider"),
    filterStatus: document.getElementById("appointments-filter-status"),
    filterStart: document.getElementById("appointments-filter-start"),
    filterEnd: document.getElementById("appointments-filter-end"),
    salesSummary: document.getElementById("sales-summary"),
    salesDaily: document.getElementById("sales-daily")
  },
  providers: {
    select: document.getElementById("provider-select"),
    form: document.getElementById("provider-form"),
    fullName: document.getElementById("provider-full-name"),
    email: document.getElementById("provider-email"),
    phone: document.getElementById("provider-phone"),
    priority: document.getElementById("provider-priority"),
    active: document.getElementById("provider-active"),
    states: document.getElementById("provider-states"),
    services: document.getElementById("provider-services"),
    availabilityForm: document.getElementById("availability-form"),
    availabilityService: document.getElementById("availability-service"),
    availabilityState: document.getElementById("availability-state"),
    availabilityDate: document.getElementById("availability-date"),
    availabilityStart: document.getElementById("availability-start"),
    availabilityEnd: document.getElementById("availability-end"),
    availabilityCapacity: document.getElementById("availability-capacity"),
    availabilityList: document.getElementById("availability-list"),
    availabilityEmpty: document.getElementById("availability-empty")
  },
  panel: {
    container: document.getElementById("appointment-panel"),
    body: document.getElementById("appointment-panel-body"),
    close: document.getElementById("close-panel")
  },
  toast: document.getElementById("toast")
};

init();

async function init() {
  setupTabs();
  setupHandlers();
  renderStateSelectors();
  await loadInitialData();
}

function setupTabs() {
  elements.tabs.forEach((button) => {
    button.addEventListener("click", () => {
      elements.tabs.forEach((b) => b.classList.remove("active"));
      button.classList.add("active");
      const tab = button.dataset.tab;
      Object.entries(elements.panels).forEach(([key, panel]) => {
        panel.classList.toggle("active", key === tab);
      });
    });
  });
}

function setupHandlers() {
  elements.booking.stateSelect.addEventListener("change", () => {
    state.booking.selectedState = elements.booking.stateSelect.value;
    refreshBookingAvailability();
    renderServiceChips();
  });

  elements.booking.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors(elements.booking.form);
    if (!state.booking.selectedService) {
      setError("booking-service", "Select a service");
      return;
    }
    if (!state.booking.selectedSlot) {
      setError("booking-time", "Select a time");
      return;
    }
    if (!elements.booking.consentCheckbox.checked) {
      setError("sms-consent", "Consent required to send texts");
      return;
    }
    const providerId = elements.booking.providerSelect.value;
    if (!providerId) {
      setError("booking-provider", "Choose a provider");
      return;
    }
    const payload = {
      service_id: state.booking.selectedService,
      provider_id: providerId,
      start_time: state.booking.selectedSlot,
      state_code: state.booking.selectedState,
      patient_name: elements.booking.nameInput.value.trim(),
      patient_email: elements.booking.emailInput.value.trim(),
      patient_phone: elements.booking.phoneInput.value.trim()
    };
    try {
      const result = await apiFetch("/appointments", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      showToast("Appointment booked and notifications sent.");
      state.booking.selectedSlot = null;
      elements.booking.form.reset();
      elements.booking.consentCheckbox.checked = false;
      renderTimes();
      renderProviderDropdown();
      renderConfirmation(result);
      await refreshAppointments();
      await refreshSales();
      await refreshBookingAvailability();
    } catch (error) {
      handleFormError(error, {
        patient_name: "patient_name",
        patient_email: "patient_email",
        patient_phone: "patient_phone",
        service_id: "booking-service",
        provider_id: "booking-provider",
        start_time: "booking-time",
        state_code: "booking-state"
      });
    }
  });

  elements.admin.serviceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors(elements.admin.serviceForm);
    const payload = {
      name: elements.admin.serviceName.value.trim(),
      price_cents: dollarsToCents(elements.admin.servicePrice.value),
      duration_min: Number(elements.admin.serviceDuration.value),
      active: elements.admin.serviceActive.checked,
      state_codes: getCheckedValues(elements.admin.serviceStates)
    };
    try {
      await apiFetch("/services", { method: "POST", body: JSON.stringify(payload) });
      showToast("Service created");
      elements.admin.serviceForm.reset();
      elements.admin.serviceActive.checked = true;
      renderStateSelectors();
      await refreshServices();
      renderServiceChips();
      refreshAdminFilters();
      renderProviderServices();
      renderProviderForm();
    } catch (error) {
      handleFormError(error, {
        name: "service-name",
        price_cents: "service-price",
        duration_min: "service-duration",
        state_codes: "service-states"
      });
    }
  });

  elements.admin.filterService.addEventListener("change", () => {
    state.adminFilters.service = elements.admin.filterService.value;
    refreshAppointments();
    refreshSales();
  });
  elements.admin.filterProvider.addEventListener("change", () => {
    state.adminFilters.provider = elements.admin.filterProvider.value;
    refreshAppointments();
    refreshSales();
  });
  elements.admin.filterStatus.addEventListener("change", () => {
    state.adminFilters.status = elements.admin.filterStatus.value;
    refreshAppointments();
    refreshSales();
  });
  elements.admin.filterStart.addEventListener("change", () => {
    state.adminFilters.start = elements.admin.filterStart.value;
    refreshAppointments();
    refreshSales();
  });
  elements.admin.filterEnd.addEventListener("change", () => {
    state.adminFilters.end = elements.admin.filterEnd.value;
    refreshAppointments();
    refreshSales();
  });

  elements.admin.providerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors(elements.admin.providerForm);
    const payload = {
      full_name: elements.admin.providerName.value.trim(),
      email: elements.admin.providerEmail.value.trim(),
      phone: elements.admin.providerPhone.value.trim(),
      priority: elements.admin.providerPriority.value ? Number(elements.admin.providerPriority.value) : undefined,
      active: elements.admin.providerActive.checked,
      state_codes: getCheckedValues(elements.admin.providerStates),
      offered_service_ids: getCheckedValues(elements.admin.providerServices)
    };
    try {
      await apiFetch("/providers", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      showToast("Provider created");
      elements.admin.providerForm.reset();
      elements.admin.providerActive.checked = true;
      await refreshProviders();
      renderProviderSelector();
      renderProviderForm();
      renderAvailabilitySelectors();
      refreshAdminFilters();
      refreshBookingAvailability();
    } catch (error) {
      handleFormError(error, {
        full_name: "admin-provider-name",
        email: "admin-provider-email",
        phone: "admin-provider-phone",
        state_codes: "admin-provider-states",
        offered_service_ids: "admin-provider-services"
      });
    }
  });

  elements.providers.select.addEventListener("change", () => {
    state.providerTab.selectedProviderId = elements.providers.select.value;
    renderProviderForm();
    renderAvailabilitySelectors();
    renderAvailabilityList();
  });

  elements.providers.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors(elements.providers.form);
    const providerId = state.providerTab.selectedProviderId;
    if (!providerId) return;
    const payload = {
      full_name: elements.providers.fullName.value.trim(),
      email: elements.providers.email.value.trim(),
      phone: elements.providers.phone.value.trim(),
      priority: elements.providers.priority.value ? Number(elements.providers.priority.value) : undefined,
      active: elements.providers.active.checked,
      state_codes: getCheckedValues(elements.providers.states),
      offered_service_ids: getCheckedValues(elements.providers.services)
    };
    try {
      const updated = await apiFetch(`/providers/${encodeURIComponent(providerId)}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      showToast("Provider updated");
      await refreshProviders();
      state.providerTab.selectedProviderId = updated.provider_id;
      renderProviderSelector();
      renderProviderForm();
      renderAvailabilitySelectors();
      refreshAdminFilters();
      refreshBookingAvailability();
    } catch (error) {
      handleFormError(error, {
        full_name: "provider-full_name",
        email: "provider-email",
        phone: "provider-phone",
        state_codes: "provider-states",
        offered_service_ids: "provider-services"
      });
    }
  });

  elements.providers.availabilityForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors(elements.providers.availabilityForm);
    const providerId = state.providerTab.selectedProviderId;
    if (!providerId) return;
    const serviceId = elements.providers.availabilityService.value;
    const stateCode = elements.providers.availabilityState.value;
    const date = elements.providers.availabilityDate.value;
    const start = elements.providers.availabilityStart.value;
    const end = elements.providers.availabilityEnd.value;
    if (!serviceId) setError("availability-service", "Select a service");
    if (!stateCode) setError("availability-state", "Select a state");
    if (!date) setError("availability-date", "Select a date");
    if (!start) setError("availability-start", "Start time required");
    if (!end) setError("availability-end", "End time required");
    if (!serviceId || !stateCode || !date || !start || !end) return;
    const payload = {
      provider_id: providerId,
      service_id: serviceId,
      state_code: stateCode,
      start_time: localToUtc(date, start),
      end_time: localToUtc(date, end),
      capacity: Number(elements.providers.availabilityCapacity.value) || 1
    };
    try {
      await apiFetch("/availability", { method: "POST", body: JSON.stringify(payload) });
      showToast("Availability added");
      elements.providers.availabilityForm.reset();
      renderAvailabilityList();
      refreshBookingAvailability();
    } catch (error) {
      handleFormError(error, {
        provider_id: "provider-select",
        service_id: "availability-service",
        state_code: "availability-state",
        start_time: "availability-start",
        end_time: "availability-end",
        capacity: "availability-capacity"
      });
    }
  });

  elements.panel.close.addEventListener("click", () => {
    elements.panel.container.classList.remove("open");
    elements.panel.container.setAttribute("aria-hidden", "true");
  });
}

async function loadInitialData() {
  await Promise.all([refreshServices(), refreshProviders()]);
  renderServiceChips();
  refreshAdminFilters();
  renderProviderSelector();
  renderProviderForm();
  renderAvailabilitySelectors();
  await refreshBookingAvailability();
  await refreshAppointments();
  await refreshSales();
  renderAvailabilityList();
}

function renderStateSelectors() {
  elements.booking.stateSelect.innerHTML = STATE_OPTIONS.map((code) => `<option value="${code}">${code}</option>`).join("");
  elements.booking.stateSelect.value = state.booking.selectedState;
  renderPillGroup(elements.admin.serviceStates, STATE_OPTIONS, new Set());
  renderPillGroup(elements.admin.providerStates, STATE_OPTIONS, new Set());
  renderPillGroup(elements.providers.states, STATE_OPTIONS, new Set());
}

function renderServiceChips() {
  const services = state.services.filter((service) => service.active);
  elements.booking.serviceChips.innerHTML = "";
  services
    .filter((service) => service.state_codes.includes(state.booking.selectedState))
    .forEach((service) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `chip${state.booking.selectedService === service.service_id ? " active" : ""}`;
      button.textContent = service.name;
      button.addEventListener("click", () => {
        state.booking.selectedService = service.service_id;
        state.booking.selectedSlot = null;
        refreshBookingAvailability();
        renderServiceChips();
      });
      elements.booking.serviceChips.appendChild(button);
    });
}

function getCachedAvailability() {
  return state.availabilityCache.get(cacheKey()) || [];
}

function cacheKey() {
  return `${state.booking.selectedService || ""}|${state.booking.selectedState || ""}`;
}

async function refreshBookingAvailability() {
  if (!state.booking.selectedService) {
    state.availabilityCache.delete(cacheKey());
    renderTimes();
    renderProviderDropdown();
    return;
  }
  const start = new Date();
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    service_id: state.booking.selectedService,
    state: state.booking.selectedState,
    start: start.toISOString(),
    end: end.toISOString()
  });
  const data = await apiFetch(`/availability?${params.toString()}`);
  state.availabilityCache.set(cacheKey(), data || []);
  renderTimes();
  renderProviderDropdown();
}

function renderTimes() {
  const container = elements.booking.timesContainer;
  container.innerHTML = "";
  const availability = getCachedAvailability();
  if (!availability.length) {
    container.innerHTML = `<div class="muted">No availability in the next seven days.</div>`;
    return;
  }
  const grouped = availability.reduce((acc, slot) => {
    const key = formatDate(slot.start_time);
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key).push(slot);
    return acc;
  }, new Map());
  grouped.forEach((slots, day) => {
    const wrapper = document.createElement("div");
    wrapper.className = "card";
    wrapper.style.padding = "16px";
    const title = document.createElement("div");
    title.textContent = day;
    title.style.fontWeight = "600";
    title.style.marginBottom = "8px";
    wrapper.appendChild(title);
    const list = document.createElement("div");
    list.className = "chips";
    slots.forEach((slot) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `chip${state.booking.selectedSlot === slot.start_time ? " active" : ""}`;
      button.textContent = formatTime(slot.start_time);
      button.addEventListener("click", () => {
        state.booking.selectedSlot = slot.start_time;
        renderTimes();
        renderProviderDropdown();
      });
      list.appendChild(button);
    });
    wrapper.appendChild(list);
    container.appendChild(wrapper);
  });
}

function getProvidersForSelectedSlot() {
  if (!state.booking.selectedSlot) return [];
  const availability = getCachedAvailability().filter((slot) => slot.start_time === state.booking.selectedSlot);
  const providers = availability
    .map((slot) => state.providers.find((provider) => provider.provider_id === slot.provider_id))
    .filter(Boolean)
    .sort((a, b) => {
      const ap = Number.isFinite(a.priority) ? a.priority : Number.MAX_SAFE_INTEGER;
      const bp = Number.isFinite(b.priority) ? b.priority : Number.MAX_SAFE_INTEGER;
      if (ap === bp) return a.full_name.localeCompare(b.full_name);
      return ap - bp;
    });
  return providers.map((provider) => ({ provider }));
}

function renderProviderDropdown() {
  const select = elements.booking.providerSelect;
  select.innerHTML = "";
  if (!state.booking.selectedSlot) {
    select.disabled = true;
    return;
  }
  const providers = getProvidersForSelectedSlot();
  providers.forEach(({ provider }) => {
    const option = document.createElement("option");
    option.value = provider.provider_id;
    option.textContent = `${provider.full_name} • priority ${provider.priority ?? "∞"}`;
    select.appendChild(option);
  });
  select.disabled = providers.length === 0;
  if (providers.length) {
    select.value = providers[0].provider.provider_id;
  }
}

function renderConfirmation(appointment) {
  if (!appointment) {
    elements.booking.confirmation.style.display = "none";
    return;
  }
  elements.booking.confirmation.innerHTML = `
    <h3 style="margin-top:0;">You're booked!</h3>
    <p>Your telehealth visit with <strong>${appointment.provider_name || appointment.provider_id}</strong> is scheduled for <strong>${formatDateTime(appointment.start_time)}</strong>.</p>
    <p>Confirmation emails and texts have been sent to the patient and provider.</p>
  `;
  elements.booking.confirmation.style.display = "block";
}

async function refreshServices() {
  const data = await apiFetch("/services?active=false");
  state.services = data || [];
  renderServiceCards();
  renderAdminProviderServices();
  renderAdminProviders();
}

function renderServiceCards() {
  const container = elements.admin.servicesTable;
  container.innerHTML = "";
  state.services
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((service) => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.padding = "16px";
      card.innerHTML = `
        <div class="inline" style="justify-content:space-between;">
          <div>
            <div style="font-weight:600;">${service.name}</div>
            <div class="muted">${formatDollars(service.price_cents)} • ${service.duration_min} min • States: ${service.state_codes.join(", ")}</div>
          </div>
          <label class="inline" style="gap:6px;">
            <input type="checkbox" ${service.active ? "checked" : ""} data-action="toggle" data-id="${service.service_id}">
            <span class="muted">Active</span>
          </label>
        </div>
        <div class="grid-cols-2" style="margin-top:12px;">
          <div class="field">
            <label><span class="title">Price (USD)</span>
              <input type="number" min="0" step="0.01" value="${(service.price_cents / 100).toFixed(2)}" data-field="price" data-id="${service.service_id}">
            </label>
          </div>
          <div class="field">
            <label><span class="title">Duration</span>
              <input type="number" min="5" step="5" value="${service.duration_min}" data-field="duration" data-id="${service.service_id}">
            </label>
          </div>
        </div>
        <div class="field">
          <label><span class="title">States</span></label>
          <div class="pill-toggle" data-field="states" data-id="${service.service_id}"></div>
        </div>
        <div class="inline">
          <button type="button" class="primary" data-action="save" data-id="${service.service_id}">Save changes</button>
        </div>
      `;
      container.appendChild(card);
      const pillContainer = card.querySelector('[data-field="states"]');
      renderPillGroup(pillContainer, STATE_OPTIONS, new Set(service.state_codes));
    });

  container.querySelectorAll('button[data-action="save"]').forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.dataset.id;
      const priceInput = container.querySelector(`input[data-field="price"][data-id="${id}"]`);
      const durationInput = container.querySelector(`input[data-field="duration"][data-id="${id}"]`);
      const stateContainer = container.querySelector(`div[data-field="states"][data-id="${id}"]`);
      const activeCheckbox = container.querySelector(`input[data-action="toggle"][data-id="${id}"]`);
      const payload = {
        price_cents: dollarsToCents(priceInput.value),
        duration_min: Number(durationInput.value),
        active: activeCheckbox.checked,
        state_codes: getCheckedValues(stateContainer)
      };
      try {
        await apiFetch(`/services/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        showToast("Service updated");
        await refreshServices();
        renderServiceChips();
        refreshAdminFilters();
        renderProviderServices();
        renderProviderForm();
        refreshBookingAvailability();
      } catch (error) {
        showInlineError(elements.admin.serviceError, error?.payload?.error || "Failed to update service");
      }
    });
  });
}

async function refreshProviders() {
  const data = await apiFetch("/providers");
  state.providers = data || [];
  renderAdminProviders();
}

function renderProviderSelector() {
  const select = elements.providers.select;
  select.innerHTML = state.providers.map((provider) => `<option value="${provider.provider_id}">${provider.full_name}</option>`).join("");
  if (!state.providers.length) {
    select.innerHTML = `<option value="">No providers yet</option>`;
    elements.providers.form.style.display = "none";
    elements.providers.availabilityForm.style.display = "none";
    return;
  }
  elements.providers.form.style.display = "grid";
  elements.providers.availabilityForm.style.display = "grid";
  if (!state.providerTab.selectedProviderId || !state.providers.some((p) => p.provider_id === state.providerTab.selectedProviderId)) {
    state.providerTab.selectedProviderId = state.providers[0].provider_id;
  }
  select.value = state.providerTab.selectedProviderId;
}

function renderProviderForm() {
  const provider = state.providers.find((p) => p.provider_id === state.providerTab.selectedProviderId);
  if (!provider) return;
  elements.providers.fullName.value = provider.full_name || "";
  elements.providers.email.value = provider.email || "";
  elements.providers.phone.value = provider.phone || "";
  elements.providers.priority.value = provider.priority ?? "";
  elements.providers.active.checked = provider.active;
  renderPillGroup(elements.providers.states, STATE_OPTIONS, new Set(provider.state_codes));
  renderProviderServices();
  const serviceSet = new Set(provider.offered_service_ids);
  elements.providers.services.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.checked = serviceSet.has(input.value);
  });
}

function renderProviderServices() {
  const activeServices = state.services.filter((service) => service.active);
  renderPillGroup(elements.providers.services, activeServices.map((service) => service.service_id), new Set());
  elements.providers.services.querySelectorAll('label').forEach((label, index) => {
    const service = activeServices[index];
    if (!service) return;
    label.querySelector('input').value = service.service_id;
    label.querySelector('span').textContent = `${service.name} (${service.state_codes.join(", ")})`;
  });
}

function renderAdminProviderServices() {
  if (!elements.admin.providerServices) return;
  renderServiceOptions(elements.admin.providerServices, new Set());
}

function renderServiceOptions(container, selectedSet) {
  if (!container) return;
  container.innerHTML = state.services
    .map((service) => `
      <label>
        <input type="checkbox" value="${service.service_id}" ${selectedSet.has(service.service_id) ? "checked" : ""}>
        <span>${service.name} (${service.state_codes.join(", ")})</span>
      </label>
    `)
    .join("");
}

function renderAdminProviders() {
  const container = elements.admin.providersList;
  if (!container) return;
  container.innerHTML = "";
  if (!state.providers.length) {
    container.innerHTML = '<div class="muted">No providers yet.</div>';
    return;
  }
  state.providers
    .slice()
    .sort((a, b) => {
      const ap = Number.isFinite(a.priority) ? a.priority : Number.MAX_SAFE_INTEGER;
      const bp = Number.isFinite(b.priority) ? b.priority : Number.MAX_SAFE_INTEGER;
      if (ap === bp) return a.full_name.localeCompare(b.full_name);
      return ap - bp;
    })
    .forEach((provider) => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.padding = "16px";
      card.innerHTML = `
        <div class="inline" style="justify-content:space-between;">
          <div>
            <div style="font-weight:600;">${provider.full_name}</div>
            <div class="muted">${provider.email || ""} • ${provider.phone || ""}</div>
          </div>
          <label class="inline" style="gap:6px;">
            <input type="checkbox" ${provider.active ? "checked" : ""} data-role="active" data-id="${provider.provider_id}">
            <span class="muted">Active</span>
          </label>
        </div>
        <div class="grid-cols-2" style="margin-top:12px;">
          <div class="field">
            <label><span class="title">Priority</span>
              <input type="number" min="1" step="1" value="${provider.priority ?? ""}" data-role="priority" data-id="${provider.provider_id}">
            </label>
          </div>
        </div>
        <div class="field">
          <label><span class="title">States</span></label>
          <div class="pill-toggle" data-role="states" data-id="${provider.provider_id}"></div>
        </div>
        <div class="field">
          <label><span class="title">Services</span></label>
          <div class="pill-toggle" data-role="services" data-id="${provider.provider_id}"></div>
        </div>
        <div class="inline">
          <button type="button" class="primary" data-action="save-provider" data-id="${provider.provider_id}">Save changes</button>
          <button type="button" class="danger" data-action="delete-provider" data-id="${provider.provider_id}">Delete</button>
        </div>
      `;
      container.appendChild(card);
      renderPillGroup(card.querySelector('[data-role="states"]'), STATE_OPTIONS, new Set(provider.state_codes));
      renderServiceOptions(card.querySelector('[data-role="services"]'), new Set(provider.offered_service_ids));
    });

  container.querySelectorAll('button[data-action="save-provider"]').forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.dataset.id;
      const scope = button.closest(".card");
      const priorityInput = scope.querySelector(`input[data-role="priority"][data-id="${id}"]`);
      const activeInput = scope.querySelector(`input[data-role="active"][data-id="${id}"]`);
      const statesContainer = scope.querySelector(`div[data-role="states"][data-id="${id}"]`);
      const servicesContainer = scope.querySelector(`div[data-role="services"][data-id="${id}"]`);
      const payload = {
        priority: priorityInput.value ? Number(priorityInput.value) : undefined,
        active: activeInput.checked,
        state_codes: getCheckedValues(statesContainer),
        offered_service_ids: getCheckedValues(servicesContainer)
      };
      try {
        await apiFetch(`/providers/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        showToast("Provider updated");
        await refreshProviders();
        renderProviderSelector();
        renderProviderForm();
        renderAvailabilitySelectors();
        refreshAdminFilters();
        refreshBookingAvailability();
      } catch (error) {
        showToast(error?.payload?.error || "Unable to update provider", true);
      }
    });
  });

  container.querySelectorAll('button[data-action="delete-provider"]').forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.dataset.id;
      if (!confirm("Delete this provider? Future availability will be removed.")) return;
      try {
        await apiFetch(`/providers/${encodeURIComponent(id)}`, { method: "DELETE" });
        showToast("Provider removed");
        await refreshProviders();
        renderProviderSelector();
        renderProviderForm();
        renderAvailabilitySelectors();
        refreshAdminFilters();
        refreshBookingAvailability();
      } catch (error) {
        showToast(error?.payload?.error || "Unable to delete provider", true);
      }
    });
  });
}

function renderAvailabilitySelectors() {
  const provider = state.providers.find((p) => p.provider_id === state.providerTab.selectedProviderId);
  if (!provider) return;
  elements.providers.availabilityService.innerHTML = provider.offered_service_ids
    .map((id) => {
      const service = state.services.find((s) => s.service_id === id);
      return service ? `<option value="${id}">${service.name}</option>` : "";
    })
    .join("");
  elements.providers.availabilityState.innerHTML = provider.state_codes.map((code) => `<option value="${code}">${code}</option>`).join("");
}

async function renderAvailabilityList() {
  const providerId = state.providerTab.selectedProviderId;
  if (!providerId) return;
  const now = new Date();
  const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    provider_id: providerId,
    start: now.toISOString(),
    end: end.toISOString()
  });
  try {
    const slots = await apiFetch(`/availability?${params.toString()}`);
    const list = elements.providers.availabilityList;
    list.innerHTML = "";
    if (!slots.length) {
      elements.providers.availabilityEmpty.style.display = "block";
      return;
    }
    elements.providers.availabilityEmpty.style.display = "none";
    slots.forEach((slot) => {
      const li = document.createElement("li");
      const service = state.services.find((s) => s.service_id === slot.service_id);
      li.innerHTML = `
        <div>
          <div style="font-weight:600;">${formatDateTime(slot.start_time)}</div>
          <div class="muted">${service ? service.name : slot.service_id} • State ${slot.state_code}</div>
        </div>
        <button type="button" class="danger" data-provider="${slot.provider_id}" data-service="${slot.service_id}" data-start="${slot.start_time}">Delete</button>
      `;
      list.appendChild(li);
    });
    list.querySelectorAll("button.danger").forEach((button) => {
      button.addEventListener("click", async () => {
        const provider = button.dataset.provider;
        const service = button.dataset.service;
        const start = button.dataset.start;
        try {
          await apiFetch(`/availability/${encodeURIComponent(provider)}/${encodeURIComponent(start)}/${encodeURIComponent(service)}`, {
            method: "DELETE"
          });
          showToast("Availability removed");
          renderAvailabilityList();
          refreshBookingAvailability();
        } catch (error) {
          showToast(error?.payload?.error || "Unable to delete slot", true);
        }
      });
    });
  } catch (error) {
    elements.providers.availabilityEmpty.style.display = "block";
  }
}

async function refreshAppointments() {
  const params = new URLSearchParams();
  if (state.adminFilters.service) params.set("service_id", state.adminFilters.service);
  if (state.adminFilters.provider) params.set("provider_id", state.adminFilters.provider);
  if (state.adminFilters.status) params.set("status", state.adminFilters.status);
  if (state.adminFilters.start) params.set("start", new Date(state.adminFilters.start).toISOString());
  if (state.adminFilters.end) {
    const endDate = new Date(state.adminFilters.end);
    endDate.setHours(23, 59, 59, 999);
    params.set("end", endDate.toISOString());
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  const data = await apiFetch(`/appointments${query}`);
  state.appointments = data || [];
  renderAppointmentsTable();
}

function renderAppointmentsTable() {
  const tbody = elements.admin.appointmentsTable;
  tbody.innerHTML = "";
  if (!state.appointments.length) {
    elements.admin.appointmentsEmpty.style.display = "block";
    return;
  }
  elements.admin.appointmentsEmpty.style.display = "none";
  state.appointments.forEach((appointment) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${appointment.patient_name}</td>
      <td>${appointment.service_name || appointment.service_id}</td>
      <td>${appointment.provider_name || appointment.provider_id}</td>
      <td>${formatDateTime(appointment.start_time)}</td>
      <td><span class="badge">${appointment.status}</span></td>
    `;
    tr.addEventListener("click", () => openAppointmentPanel(appointment));
    tbody.appendChild(tr);
  });
}

function openAppointmentPanel(appointment) {
  elements.panel.body.innerHTML = `
    <div><strong>Patient:</strong> ${appointment.patient_name}</div>
    <div><strong>Email:</strong> ${appointment.patient_email}</div>
    <div><strong>Phone:</strong> ${appointment.patient_phone}</div>
    <div><strong>Service:</strong> ${appointment.service_name || appointment.service_id}</div>
    <div><strong>Provider:</strong> ${appointment.provider_name || appointment.provider_id}</div>
    <div><strong>Start:</strong> ${formatDateTime(appointment.start_time)}</div>
    <div><strong>Status:</strong> ${appointment.status}</div>
    <div><strong>State:</strong> ${appointment.state_code}</div>
    <div><strong>Price:</strong> ${formatDollars(appointment.price_cents)}</div>
  `;
  elements.panel.container.classList.add("open");
  elements.panel.container.setAttribute("aria-hidden", "false");
}

async function refreshSales() {
  const params = new URLSearchParams();
  if (state.adminFilters.start) params.set("start", new Date(state.adminFilters.start).toISOString());
  if (state.adminFilters.end) {
    const endDate = new Date(state.adminFilters.end);
    endDate.setHours(23, 59, 59, 999);
    params.set("end", endDate.toISOString());
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  const data = await apiFetch(`/stats/sales${query}`);
  renderSales(data);
}

function renderSales(data) {
  const summary = data?.summary || {};
  elements.admin.salesSummary.innerHTML = `
    <div class="card" style="padding:16px;">
      <div class="muted">Gross sales</div>
      <div style="font-size:1.3rem;font-weight:600;">${formatDollars(summary.gross_cents || 0)}</div>
    </div>
    <div class="card" style="padding:16px;">
      <div class="muted">Refunds</div>
      <div style="font-size:1.3rem;font-weight:600;">${formatDollars(summary.refunds_cents || 0)}</div>
    </div>
    <div class="card" style="padding:16px;">
      <div class="muted">Net sales</div>
      <div style="font-size:1.3rem;font-weight:600;">${formatDollars(summary.net_cents || 0)}</div>
    </div>
    <div class="card" style="padding:16px;">
      <div class="muted">Paid appointments</div>
      <div style="font-size:1.3rem;font-weight:600;">${summary.paid_appointments || 0}</div>
    </div>
    <div class="card" style="padding:16px;">
      <div class="muted">Average order value</div>
      <div style="font-size:1.3rem;font-weight:600;">${formatDollars(summary.average_order_value_cents || 0)}</div>
    </div>
  `;
  elements.admin.salesDaily.innerHTML = (data?.daily || [])
    .map((day) => `
      <div class="card" style="padding:16px;">
        <div style="font-weight:600;">${day.date}</div>
        <div class="muted">Gross: ${formatDollars(day.gross_cents)}</div>
        <div class="muted">Refunds: ${formatDollars(day.refunds_cents)}</div>
        <div class="muted">Net: ${formatDollars(day.net_cents)}</div>
        <div class="muted">Appointments: ${day.appointment_count}</div>
      </div>
    `)
    .join("");
}

function refreshAdminFilters() {
  elements.admin.filterService.innerHTML = `<option value="">All services</option>` + state.services.map((service) => `<option value="${service.service_id}">${service.name}</option>`).join("");
  elements.admin.filterProvider.innerHTML = `<option value="">All providers</option>` + state.providers.map((provider) => `<option value="${provider.provider_id}">${provider.full_name}</option>`).join("");
}

function renderPillGroup(container, options, selectedSet) {
  container.innerHTML = options
    .map((value) => `
      <label>
        <input type="checkbox" value="${value}" ${selectedSet.has(value) ? "checked" : ""}>
        <span>${value}</span>
      </label>
    `)
    .join("");
}

function getCheckedValues(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map((input) => input.value);
}

function clearErrors(root) {
  if (!root) return;
  root.querySelectorAll(".error-text").forEach((el) => {
    el.textContent = "";
  });
}

function setError(key, message) {
  const el = document.querySelector(`[data-error="${key}"]`);
  if (el) el.textContent = message;
}

function showInlineError(el, message) {
  if (el) el.textContent = message;
}

function handleFormError(error, fieldMap) {
  const payload = error?.payload || error?.data || {};
  const fields = payload.fields || {};
  Object.entries(fields).forEach(([field, message]) => {
    const key = fieldMap[field] || field;
    setError(key, message);
  });
  if (!Object.keys(fields).length && payload.error) {
    showToast(payload.error, true);
  }
}

async function apiFetch(path, options = {}) {
  const method = options.method || "GET";
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    body: method && method !== "GET" && method !== "HEAD" ? options.body : undefined
  });
  let payload = null;
  if (response.status !== 204) {
    try {
      payload = await response.json();
    } catch (err) {
      payload = null;
    }
  }
  if (!response.ok || (payload && payload.ok === false)) {
    const error = new Error(payload?.error || response.statusText || "Request failed");
    error.payload = payload;
    throw error;
  }
  return payload?.data ?? payload;
}

function showToast(message, isError = false) {
  const toast = elements.toast;
  toast.textContent = message;
  toast.style.background = isError ? "#b91c1c" : "#0b1320";
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3500);
}

function formatDateTime(isoString) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(isoString));
}

function formatDate(isoString) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(new Date(isoString));
}

function formatTime(isoString) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(isoString));
}

function formatDollars(cents) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents || 0) / 100);
}

function dollarsToCents(value) {
  if (!value) return 0;
  return Math.round(Number(value) * 100);
}

function localToUtc(date, time) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const base = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const offsetHours = centralOffsetHours(base);
  return new Date(base.getTime() - offsetHours * 3600000).toISOString();
}

function centralOffsetHours(date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    timeZoneName: "short"
  });
  const zone = formatter
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value || "CST";
  return zone.includes("CDT") ? -5 : -6;
}
