class LocationList {
  constructor() {
    this.locations = [];
    this.filteredLocations = [];
    this.orderBy = null;
    this.orderAsc = true;
    this.userLocation = null;
    this.advancedFiltersVisible = false;
  }

  async init() {
    this.render(); // This will show skeleton loading
    await this.fetchLocations();
    try {
      this.userLocation = await this.getUserLocation();
    } catch (error) {
      console.error("Couldn't get user location:", error);
    }
    this.applySorting('address');
    this.updateList(); // This will replace skeleton with actual data
  }

  async fetchLocations() {
    const { data, error } = await _supabaseClient
      .from("location")
      .select("id, address, latitude, longitude, location_type, is_participating, phone_number, has_candy, is_start, route, has_activity, activity_details")
      .eq("is_participating", true);

    if (error) {
      console.error("Error fetching locations:", error);
      return;
    }

    this.locations = data.map(locationData => new LocationModel(locationData));
    this.filteredLocations = [...this.locations];
  }

  render() {
    const container = document.getElementById('location-list-container');
    container.innerHTML = '';

    // Create a div for filters and sorting
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'mb-4 space-y-2';
    const sortOptions = `
      <option value="">All</option>
      <option value="address">Address</option>
      <option value="location_type">Location Type</option>
      ${this.userLocation ? '<option value="distance">Distance</option>' : ''}
    `;
    controlsDiv.innerHTML = `
      <div class="flex items-center space-x-2">
        <div class="flex-grow relative">
          <input type="text" id="address-filter" placeholder="Filter by address" class="p-2 pr-8 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm w-full">
          <i class="fas fa-search absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
        </div>
        <button id="toggle-filters" class="p-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-gray-400">
          <i class="fas fa-sliders-h text-gray-600 dark:text-gray-300"></i>
        </button>
      </div>
      <div id="advanced-filters" class="hidden">
        <div class="flex flex-wrap gap-2">
          <div class="flex-1 min-w-[200px]">
            <label for="candy-filter" class="text-sm font-medium mb-1 block">Filter by candy:</label>
            <select id="candy-filter" class="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm w-full">
              <option value="">All Candy</option>
              <option value="true">Has Candy</option>
              <option value="false">No Candy</option>
            </select>
          </div>
          <div class="flex-1 min-w-[200px]">
            <label for="activity-filter" class="text-sm font-medium mb-1 block">Filter by activity:</label>
            <select id="activity-filter" class="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm w-full">
              <option value="">All Activities</option>
              <option value="true">Has Activity</option>
              <option value="false">No Activity</option>
            </select>
          </div>
          <div class="flex-1 min-w-[200px]">
            <label for="sort-by" class="text-sm font-medium mb-1 block">Sort by:</label>
            <select id="sort-by" class="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm w-full">
              ${sortOptions}
            </select>
          </div>
        </div>
      </div>
    `;
    container.appendChild(controlsDiv);

    // Create table
    const table = document.createElement('table');
    table.className = 'w-full border-collapse text-sm';
    table.innerHTML = `
      <thead class="bg-gray-200 dark:bg-gray-700">
        <tr>
          <th class="p-2 text-left">Address</th>
          <th class="p-2 text-left">Type</th>
          <th class="p-2 text-left">Candy</th>
          <th class="p-2 text-left">Activity</th>
        </tr>
      </thead>
      <tbody id="location-list-body">
        ${this.createSkeletonRows()}
      </tbody>
    `;
    container.appendChild(table);

    this.addEventListeners();
  }

  updateList() {
    const tbody = document.getElementById('location-list-body');
    tbody.innerHTML = ''; // This will clear skeleton rows

    if (this.filteredLocations.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="p-2 text-center">No locations found</td></tr>';
      return;
    }

    this.filteredLocations.forEach((location, index) => {
      const row = document.createElement('tr');
      row.className = 'border-b border-gray-300 dark:border-gray-600';
      
      const typeIcon = this.getIconForLocationType(location.location_type);
      const candyInfo = this.getCandyInfo(location);
      const activityIcon = location.has_activity ? '<i class="fas fa-theater-masks ml-1 text-gray-500" title="Has activity"></i>' : '';

      let distanceInfo = '';
      if (this.userLocation) {
        const distance = this.calculateDistance(
          this.userLocation.latitude, this.userLocation.longitude,
          location.latitude, location.longitude
        );
        distanceInfo = `<span class="text-xs text-gray-500">(${distance} km)</span>`;
      }

      row.innerHTML = `
        <td class="p-2">
          <div class="font-semibold">${location.address || ''} ${distanceInfo}</div>
        </td>
        <td class="p-2">
          <div class="flex items-center">
            <span class="mr-1">${location.location_type || ''}</span>
            ${typeIcon}
          </div>
        </td>
        <td class="p-2">
          <div class="flex items-center justify-center">
            ${candyInfo}
          </div>
        </td>
        <td class="p-2">
          <div class="flex items-center">
            <span class="mr-1">${location.activity_details || ''}</span>
            ${activityIcon}
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  getIconForLocationType(locationType) {
    switch (locationType) {
      case "House":
        return '<i class="fas fa-home text-gray-500" title="House"></i>';
      case "Table":
        return '<i class="fas fa-table text-gray-500" title="Table"></i>';
      case "Car":
        return '<i class="fas fa-car text-gray-500" title="Car"></i>';
      case "Parking":
        return '<i class="fas fa-parking text-gray-500" title="Parking"></i>';
      case "Refreshments":
        return '<i class="fas fa-coffee text-gray-500" title="Refreshments"></i>';
      default:
        return '';
    }
  }

  getCandyInfo(location) {
    if (["House", "Table", "Car"].includes(location.location_type) && location.has_candy !== null) {
      return location.has_candy ?
        '<i class="fas fa-candy-cane text-green-500" title="Has candy"></i>' :
        '<i class="fas fa-times-circle text-red-500" title="No candy"></i>';
    }
    return '';
  }

  addEventListeners() {
    document.getElementById('address-filter').addEventListener('input', () => this.applyFilters());
    document.getElementById('candy-filter').addEventListener('change', () => this.applyFilters());
    document.getElementById('activity-filter').addEventListener('change', () => this.applyFilters());
    document.getElementById('sort-by').addEventListener('change', (e) => this.applySorting(e.target.value));
    
    // Add event listener for the toggle button
    document.getElementById('toggle-filters').addEventListener('click', () => this.toggleAdvancedFilters());
  }

  toggleAdvancedFilters() {
    const advancedFilters = document.getElementById('advanced-filters');
    const toggleButton = document.getElementById('toggle-filters');
    this.advancedFiltersVisible = !this.advancedFiltersVisible;
    if (this.advancedFiltersVisible) {
      advancedFilters.classList.remove('hidden');
      toggleButton.innerHTML = '<i class="fas fa-times text-gray-600 dark:text-gray-300"></i>';
      toggleButton.title = 'Hide advanced filters';
    } else {
      advancedFilters.classList.add('hidden');
      toggleButton.innerHTML = '<i class="fas fa-sliders-h text-gray-600 dark:text-gray-300"></i>';
      toggleButton.title = 'Show advanced filters';
    }
  }

  applyFilters() {
    const addressFilter = document.getElementById('address-filter').value.toLowerCase();
    const candyFilter = document.getElementById('candy-filter').value;
    const activityFilter = document.getElementById('activity-filter').value;

    this.filteredLocations = this.locations.filter(location => {
      return (
        location.address.toLowerCase().includes(addressFilter) &&
        (candyFilter === '' || location.has_candy.toString() === candyFilter) &&
        (activityFilter === '' || (location.has_activity ? 'true' : 'false') === activityFilter)
      );
    });

    this.updateList();
  }

  applySorting(sortBy) {
    if (this.orderBy === sortBy) {
      this.orderAsc = !this.orderAsc;
    } else {
      this.orderBy = sortBy;
      this.orderAsc = true;
    }

    if (sortBy === 'distance' && this.userLocation) {
      this.filteredLocations.sort((a, b) => {
        const distanceA = this.calculateDistance(
          this.userLocation.latitude, this.userLocation.longitude,
          a.latitude, a.longitude
        );
        const distanceB = this.calculateDistance(
          this.userLocation.latitude, this.userLocation.longitude,
          b.latitude, b.longitude
        );
        return this.orderAsc ? distanceA - distanceB : distanceB - distanceA;
      });
    } else {
      this.filteredLocations.sort((a, b) => {
        if (a[sortBy] < b[sortBy]) return this.orderAsc ? -1 : 1;
        if (a[sortBy] > b[sortBy]) return this.orderAsc ? 1 : -1;
        return 0;
      });
    }

    this.updateList();
    
    // Update the sort-by select element to reflect the current sorting
    const sortBySelect = document.getElementById('sort-by');
    if (sortBySelect) {
      sortBySelect.value = sortBy;
    }
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    return distance.toFixed(2);
  }

  async getUserLocation() {
    return new Promise((resolve, reject) => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          position => resolve(position.coords),
          error => reject(error)
        );
      } else {
        reject(new Error("Geolocation is not supported by this browser."));
      }
    });
  }

  createSkeletonRows(count = 5) {
    const skeletonRow = `
      <tr class="border-b border-gray-300 dark:border-gray-600 animate-pulse">
        <td class="p-2"><div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div></td>
        <td class="p-2"><div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div></td>
        <td class="p-2"><div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mx-auto"></div></td>
        <td class="p-2"><div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div></td>
      </tr>
    `;
    return skeletonRow.repeat(count);
  }
}

// Make LocationList available globally
window.LocationList = LocationList;
