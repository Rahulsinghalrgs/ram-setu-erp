const STORAGE_KEY = "setu.fieldOps.demo.v1";

const seedData = {
  activeStaffId: "staff-1",
  vehicles: [
    { id: "veh-1", vehicleNo: "DL 01 AB 2198", openingKm: 42120 },
    { id: "veh-2", vehicleNo: "HR 26 CX 7741", openingKm: 18940 },
    { id: "veh-3", vehicleNo: "UP 14 GT 5520", openingKm: 26488 }
  ],
  staff: [
    { id: "staff-1", fullName: "Amit Sharma", phone: "+91 98100 44121" },
    { id: "staff-2", fullName: "Neha Verma", phone: "+91 98765 23980" }
  ],
  trips: [
    {
      id: "trip-1",
      staffId: "staff-1",
      vehicleId: "veh-2",
      status: "closed",
      route: "Noida Sector 63 dealer visit",
      purpose: "Connector pins collection",
      checkinTime: offsetTime(-320),
      checkoutTime: offsetTime(-210),
      checkinKm: 18940,
      checkoutKm: 18968,
      distanceKm: 28,
      checkinLat: 28.6261,
      checkinLng: 77.3848,
      checkoutLat: 28.5355,
      checkoutLng: 77.391,
      fuelCost: 0,
      proofs: ["check-in meter", "checkout meter"],
      comments: "Material received and handed over to dispatch."
    },
    {
      id: "trip-2",
      staffId: "staff-2",
      vehicleId: "veh-1",
      status: "open",
      route: "Gurugram CCTV component vendor",
      purpose: "Quality sample pickup",
      checkinTime: offsetTime(-95),
      checkoutTime: "",
      checkinKm: 42120,
      checkoutKm: "",
      distanceKm: 0,
      checkinLat: 28.4595,
      checkinLng: 77.0266,
      checkoutLat: "",
      checkoutLng: "",
      fuelCost: 0,
      proofs: ["check-in meter"],
      comments: ""
    }
  ]
};

let state = loadState();
let activeView = "staff";

const els = {
  roleSelect: document.querySelector("#role-select"),
  tabs: [...document.querySelectorAll("[data-view]")],
  views: [...document.querySelectorAll(".view")],
  noticeRegion: document.querySelector("#notice-region"),
  resetDemo: document.querySelector("#reset-demo"),
  tripForm: document.querySelector("#trip-form"),
  formTitle: document.querySelector("#form-title"),
  tripStatusTitle: document.querySelector("#trip-status-title"),
  tripStatusBadge: document.querySelector("#trip-status-badge"),
  staffName: document.querySelector("#staff-name"),
  currentVehicle: document.querySelector("#current-vehicle"),
  currentCheckin: document.querySelector("#current-checkin"),
  currentLocation: document.querySelector("#current-location"),
  staffTripRows: document.querySelector("#staff-trip-rows"),
  adminTripRows: document.querySelector("#admin-trip-rows"),
  exceptionList: document.querySelector("#exception-list"),
  metricTrips: document.querySelector("#metric-trips"),
  metricOpen: document.querySelector("#metric-open"),
  metricKm: document.querySelector("#metric-km"),
  metricFuel: document.querySelector("#metric-fuel"),
  exportReport: document.querySelector("#export-report"),
  vehicleForm: document.querySelector("#vehicle-form"),
  staffForm: document.querySelector("#staff-form"),
  masterList: document.querySelector("#master-list")
};

function offsetTime(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return clone(seedData);
  try {
    return JSON.parse(stored);
  } catch {
    return clone(seedData);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function km(value) {
  return `${Number(value || 0).toFixed(1)} km`;
}

function byId(collection, id) {
  return collection.find((item) => item.id === id);
}

function activeStaff() {
  return byId(state.staff, state.activeStaffId) || state.staff[0];
}

function activeTripForStaff(staffId = state.activeStaffId) {
  return state.trips.find((trip) => trip.staffId === staffId && trip.status === "open");
}

function mapLink(lat, lng) {
  if (!lat || !lng) return "-";
  return `<a class="map-link" href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" rel="noreferrer">Map</a>`;
}

function proofPills(proofs = []) {
  if (!proofs.length) return "-";
  return `<div class="proof-stack">${proofs.map((proof) => `<span class="proof-pill">${proof}</span>`).join("")}</div>`;
}

function showNotice(message) {
  els.noticeRegion.innerHTML = `<div class="notice">${message}</div>`;
  window.setTimeout(() => {
    els.noticeRegion.innerHTML = "";
  }, 3400);
}

function getLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: 28.6139, lng: 77.209, accuracy: 0, fallback: true });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
          accuracy: Math.round(position.coords.accuracy),
          fallback: false
        });
      },
      () => resolve({ lat: 28.6139, lng: 77.209, accuracy: 0, fallback: true }),
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 0 }
    );
  });
}

function setView(view) {
  activeView = view;
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === view));
  els.views.forEach((panel) => panel.classList.toggle("active", panel.id === `${view}-view`));
  if (view === "admin") els.roleSelect.value = "admin";
  if (view === "staff") els.roleSelect.value = "staff";
  render();
}

function renderTripForm(openTrip) {
  if (openTrip) {
    els.formTitle.textContent = "Check Out";
    els.tripForm.innerHTML = `
      <div class="form-row">
        <label>
          End KM reading
          <input name="checkoutKm" type="number" min="${openTrip.checkinKm}" step="0.1" required />
        </label>
        <label>
          Petrol filled?
          <select name="fuelFilled" required>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </label>
      </div>
      <div id="fuel-fields" class="form-row" hidden>
        <label>
          Litres
          <input name="litres" type="number" min="0" step="0.01" />
        </label>
        <label>
          Rate per litre
          <input name="rate" type="number" min="0" step="0.01" />
        </label>
      </div>
      <label>
        Meter reading photo
        <input name="meterPhoto" type="file" accept="image/*" capture="environment" required />
      </label>
      <label>
        Petrol bill photo
        <input name="billPhoto" type="file" accept="image/*" capture="environment" />
      </label>
      <label>
        Comments
        <textarea name="comments" rows="3" placeholder="Delivery, collection, or exception note"></textarea>
      </label>
      <button class="primary-button danger-button" type="submit">
        <span data-icon="map-pin-off"></span>
        Capture GPS & Check Out
      </button>
    `;
    const fuelFilled = els.tripForm.elements.fuelFilled;
    const fuelFields = els.tripForm.querySelector("#fuel-fields");
    fuelFilled.addEventListener("change", () => {
      const enabled = fuelFilled.value === "yes";
      fuelFields.hidden = !enabled;
      els.tripForm.elements.litres.required = enabled;
      els.tripForm.elements.rate.required = enabled;
      els.tripForm.elements.billPhoto.required = enabled;
    });
  } else {
    els.formTitle.textContent = "Check In";
    els.tripForm.innerHTML = `
      <div class="form-row">
        <label>
          Vehicle
          <select name="vehicleId" required>
            <option value="">Select vehicle</option>
            ${state.vehicles.map((vehicle) => `<option value="${vehicle.id}">${vehicle.vehicleNo}</option>`).join("")}
          </select>
        </label>
        <label>
          Start KM reading
          <input name="checkinKm" type="number" min="0" step="0.1" required />
        </label>
      </div>
      <label>
        Visit address / route
        <textarea name="route" rows="3" placeholder="Dealer, vendor, delivery location" required></textarea>
      </label>
      <label>
        Purpose
        <input name="purpose" type="text" placeholder="Collection, delivery, service visit" required />
      </label>
      <label>
        Meter reading photo
        <input name="meterPhoto" type="file" accept="image/*" capture="environment" required />
      </label>
      <button class="primary-button" type="submit">
        <span data-icon="map-pin-check"></span>
        Capture GPS & Check In
      </button>
    `;
  }
  renderIcons();
}

function renderStaff() {
  const staff = activeStaff();
  const openTrip = activeTripForStaff();
  els.staffName.textContent = staff.fullName;

  if (openTrip) {
    const vehicle = byId(state.vehicles, openTrip.vehicleId);
    els.tripStatusTitle.textContent = "Trip Open";
    els.tripStatusBadge.textContent = "Open";
    els.tripStatusBadge.className = "badge open";
    els.currentVehicle.textContent = vehicle?.vehicleNo || "-";
    els.currentCheckin.textContent = formatDate(openTrip.checkinTime);
    els.currentLocation.innerHTML = mapLink(openTrip.checkinLat, openTrip.checkinLng);
  } else {
    els.tripStatusTitle.textContent = "No Open Trip";
    els.tripStatusBadge.textContent = "Ready";
    els.tripStatusBadge.className = "badge success";
    els.currentVehicle.textContent = "Not assigned";
    els.currentCheckin.textContent = "-";
    els.currentLocation.textContent = "GPS pending";
  }

  renderTripForm(openTrip);
  const rows = state.trips
    .filter((trip) => trip.staffId === staff.id)
    .sort((a, b) => new Date(b.checkinTime) - new Date(a.checkinTime))
    .map((trip) => tripRow(trip, false))
    .join("");
  els.staffTripRows.innerHTML = rows || `<tr><td colspan="8">No trips yet.</td></tr>`;
}

function tripRow(trip, adminMode) {
  const staff = byId(state.staff, trip.staffId);
  const vehicle = byId(state.vehicles, trip.vehicleId);
  const statusClass = trip.status === "open" ? "open" : "closed";
  const map = mapLink(trip.checkoutLat || trip.checkinLat, trip.checkoutLng || trip.checkinLng);
  const common = `
    <td><span class="badge ${statusClass}">${trip.status}</span></td>
    ${adminMode ? `<td>${staff?.fullName || "-"}</td>` : ""}
    <td>${vehicle?.vehicleNo || "-"}</td>
    <td>${trip.route}</td>
    <td>${formatDate(trip.checkinTime)}</td>
    <td>${formatDate(trip.checkoutTime)}</td>
    <td>${km(trip.distanceKm)}</td>
  `;
  if (adminMode) return `<tr>${common}<td>${map}</td></tr>`;
  return `<tr>${common}<td>${money(trip.fuelCost)}</td><td>${proofPills(trip.proofs)}</td></tr>`;
}

function renderAdmin() {
  const totalKm = state.trips.reduce((sum, trip) => sum + Number(trip.distanceKm || 0), 0);
  const totalFuel = state.trips.reduce((sum, trip) => sum + Number(trip.fuelCost || 0), 0);
  const openTrips = state.trips.filter((trip) => trip.status === "open").length;

  els.metricTrips.textContent = state.trips.length;
  els.metricOpen.textContent = openTrips;
  els.metricKm.textContent = km(totalKm);
  els.metricFuel.textContent = money(totalFuel);

  els.adminTripRows.innerHTML = state.trips
    .slice()
    .sort((a, b) => new Date(b.checkinTime) - new Date(a.checkinTime))
    .map((trip) => tripRow(trip, true))
    .join("");

  const exceptions = buildExceptions();
  els.exceptionList.innerHTML = exceptions.length
    ? exceptions
        .map(
          (item) => `
            <div class="exception-item">
              <div>
                <strong>${item.title}</strong>
                <p>${item.body}</p>
              </div>
              <span class="badge flag">${item.type}</span>
            </div>
          `
        )
        .join("")
    : `<div class="empty-state">No open exceptions.</div>`;
}

function buildExceptions() {
  return state.trips
    .filter((trip) => trip.status === "open" || Number(trip.distanceKm || 0) > 80)
    .map((trip) => {
      const staff = byId(state.staff, trip.staffId);
      const vehicle = byId(state.vehicles, trip.vehicleId);
      if (trip.status === "open") {
        return {
          type: "Open",
          title: `${staff?.fullName || "Staff"} has not checked out`,
          body: `${vehicle?.vehicleNo || "Vehicle"} is still on route: ${trip.route}.`
        };
      }
      return {
        type: "KM",
        title: "High distance trip",
        body: `${staff?.fullName || "Staff"} logged ${km(trip.distanceKm)} on ${vehicle?.vehicleNo || "vehicle"}.`
      };
    });
}

function renderMasters() {
  const vehicleItems = state.vehicles
    .map(
      (vehicle) => `
        <div class="master-item">
          <div>
            <strong>${vehicle.vehicleNo}</strong>
            <p>Opening KM: ${km(vehicle.openingKm)}</p>
          </div>
          <span class="badge closed">Vehicle</span>
        </div>
      `
    )
    .join("");
  const staffItems = state.staff
    .map(
      (staff) => `
        <div class="master-item">
          <div>
            <strong>${staff.fullName}</strong>
            <p>${staff.phone}</p>
          </div>
          <span class="badge success">Staff</span>
        </div>
      `
    )
    .join("");
  els.masterList.innerHTML = vehicleItems + staffItems;
}

function render() {
  renderStaff();
  renderAdmin();
  renderMasters();
  renderIcons();
}

async function handleTripSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type='submit']");
  const openTrip = activeTripForStaff();
  button.disabled = true;

  if (openTrip) {
    button.textContent = "Capturing GPS...";
    const location = await getLocation();
    const checkoutKm = Number(form.elements.checkoutKm.value);
    if (checkoutKm < Number(openTrip.checkinKm)) {
      showNotice("Checkout KM check-in KM se kam nahi ho sakta.");
      button.disabled = false;
      render();
      return;
    }
    const litres = Number(form.elements.litres?.value || 0);
    const rate = Number(form.elements.rate?.value || 0);
    openTrip.status = "closed";
    openTrip.checkoutTime = new Date().toISOString();
    openTrip.checkoutKm = checkoutKm;
    openTrip.distanceKm = checkoutKm - Number(openTrip.checkinKm);
    openTrip.checkoutLat = location.lat;
    openTrip.checkoutLng = location.lng;
    openTrip.fuelCost = litres * rate;
    openTrip.comments = form.elements.comments.value.trim();
    openTrip.proofs.push("checkout meter");
    if (form.elements.fuelFilled.value === "yes") openTrip.proofs.push("fuel bill");
    showNotice(location.fallback ? "Checkout saved with demo GPS location." : "Checkout saved with live GPS proof.");
  } else {
    button.textContent = "Capturing GPS...";
    const location = await getLocation();
    state.trips.push({
      id: `trip-${Date.now()}`,
      staffId: state.activeStaffId,
      vehicleId: form.elements.vehicleId.value,
      status: "open",
      route: form.elements.route.value.trim(),
      purpose: form.elements.purpose.value.trim(),
      checkinTime: new Date().toISOString(),
      checkoutTime: "",
      checkinKm: Number(form.elements.checkinKm.value),
      checkoutKm: "",
      distanceKm: 0,
      checkinLat: location.lat,
      checkinLng: location.lng,
      checkoutLat: "",
      checkoutLng: "",
      fuelCost: 0,
      proofs: ["check-in meter"],
      comments: ""
    });
    showNotice(location.fallback ? "Check-in saved with demo GPS location." : "Check-in saved with live GPS proof.");
  }

  saveState();
  button.disabled = false;
  render();
}

function handleVehicleSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  state.vehicles.push({
    id: `veh-${Date.now()}`,
    vehicleNo: form.elements.vehicleNo.value.trim().toUpperCase(),
    openingKm: Number(form.elements.openingKm.value)
  });
  form.reset();
  saveState();
  showNotice("Vehicle master updated.");
  render();
}

function handleStaffSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  state.staff.push({
    id: `staff-${Date.now()}`,
    fullName: form.elements.fullName.value.trim(),
    phone: form.elements.phone.value.trim()
  });
  form.reset();
  saveState();
  showNotice("Staff master updated.");
  render();
}

function exportCsv() {
  const rows = [
    ["Status", "Staff", "Vehicle", "Route", "Check-in", "Checkout", "KM", "Fuel"],
    ...state.trips.map((trip) => [
      trip.status,
      byId(state.staff, trip.staffId)?.fullName || "",
      byId(state.vehicles, trip.vehicleId)?.vehicleNo || "",
      trip.route,
      formatDate(trip.checkinTime),
      formatDate(trip.checkoutTime),
      trip.distanceKm,
      trip.fuelCost
    ])
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ram-setu-field-operations.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function renderIcons() {
  document.querySelectorAll("[data-icon]").forEach((node) => {
    node.setAttribute("data-lucide", node.dataset.icon);
  });
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

els.tabs.forEach((tab) => tab.addEventListener("click", () => setView(tab.dataset.view)));
els.roleSelect.addEventListener("change", (event) => setView(event.target.value));
els.resetDemo.addEventListener("click", () => {
  state = clone(seedData);
  saveState();
  showNotice("Demo data reset ho gaya.");
  render();
});
els.tripForm.addEventListener("submit", handleTripSubmit);
els.vehicleForm.addEventListener("submit", handleVehicleSubmit);
els.staffForm.addEventListener("submit", handleStaffSubmit);
els.exportReport.addEventListener("click", exportCsv);

render();
