// LocationModel class definition
class LocationModel {
  constructor(data = {}) {
    this.id = data.id || null;
    this.created_at = data.created_at || null;
    this.modified_at = data.modified_at || null;
    this.latitude = data.latitude || null;
    this.longitude = data.longitude || null;
    this.address = data.address || null;
    this.is_start = data.is_start || false;
    this.is_participating = data.is_participating || false;
    this.has_candy = data.has_candy || false;
    this.location_type = data.location_type || null;
    this.route = data.route || null;
    this.phone_number = data.phone_number || null;
    this.email = data.email || null;
    this.has_activity = data.has_activity || false;
    this.activity_details = data.activity_details || null;
  }

  static fromJSON(json) {
    return new LocationModel(json);
  }

  toJSON() {
    return {
      id: this.id,
      created_at: this.created_at,
      modified_at: this.modified_at,
      latitude: this.latitude,
      longitude: this.longitude,
      address: this.address,
      is_start: this.is_start,
      is_participating: this.is_participating,
      has_candy: this.has_candy,
      location_type: this.location_type,
      route: this.route,
      phone_number: this.phone_number,
      email: this.email,
      has_activity: this.has_activity,
      activity_details: this.activity_details
    };
  }
}

// Make LocationModel available globally
window.LocationModel = LocationModel;