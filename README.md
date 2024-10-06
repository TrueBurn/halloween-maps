# halloween-maps
Live maps for annual halloween route

Deployed to vercel
Uses supabase for data store

# DB

## Tables

### locations

| Column Name     | Data Type   | Constraints    |
|-----------------|-------------|----------------|
| id              | uuid        | Primary Key    |
| created_at      | timestamptz | Not Null       |
| modified_at     | timestamptz | Nullable       |
| latitude        | float8      | Not Null       |
| longitude       | float8      | Not Null       |
| address         | varchar     | Nullable       |
| is_start        | bool        | Not Null       |
| is_participating| bool        | Not Null       |
| has_candy       | bool        | Not Null       |
| location_type   | location_type | Not Null     |
| route           | route       | Nullable       |
| phone_number    | varchar     | Nullable       |
| email           | varchar     | Nullable       |
| has_activity    | bool        | Nullable       |
| activity_details| varchar     | Nullable       |


Notes:
- `location_type` is a custom enumerated type
- `route` is a custom enumerated type
- Columns marked with a diamond (♦) in the image are Non-Nullable
- Columns marked with a circle (○) in the image are Nullable

## Enumerated Types

### location_type
- House
- Table
- Parking
- Refreshments
- Car

### route
- Over 8
- Under 8

These custom data types are defined in the public schema and can be used in database tables or functions.
