# halloween-maps
Live maps for annual halloween route

Deployed to vercel
Uses supabase for data store

# DB

## Tables

### locations

Name	        Description	        Data                        Type	        Format	
id              No description      uuid	                    uuid	
created_at      No description      timestamp with time zone	timestamptz	
modified_at

No description

timestamp with time zone	timestamptz	
latitude

No description

double precision	float8	
longitude

No description

double precision	float8	
address

No description

character varying	varchar	
is_start

No description

boolean	bool	
is_participating

No description

boolean	bool	
has_candy

No description

boolean	bool	
location_type

No description

USER-DEFINED	location_type	
route

Route

USER-DEFINED	route

*************************

Use options above to edit


alter policy "Users can update their own location's has_candy status"
on "public"."location"
to public
using (
  (auth.uid() IN ( SELECT auth.uid() AS uid
   FROM auth.users
  WHERE (users.phone = (location.phone_number)::text)))
with check (
  (auth.uid() IN ( SELECT auth.uid() AS uid
   FROM auth.users
  WHERE (users.phone = (location.phone_number)::text)))
);


alter policy "Users can update their own location's has_candy status - email"
on "public"."location"
to public
using (
  (auth.uid() IN ( SELECT auth.uid() AS uid
   FROM auth.users
  WHERE ((users.email)::text = (location.email)::text)))
with check (
  (auth.uid() IN ( SELECT auth.uid() AS uid
   FROM auth.users
  WHERE ((users.email)::text = (location.email)::text)))
);