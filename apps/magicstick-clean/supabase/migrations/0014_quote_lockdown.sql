-- Security audit follow-up (S02, S03): close the anonymous write paths.
--
-- S02  `quote_requests` accepted inserts from any anonymous client straight
--      through the REST API, with a client-chosen status and unbounded text,
--      and every insert fires the owner/customer email webhook. The page's
--      security question and honeypot run in the browser only.
-- S03  The `quote-uploads` bucket accepted uploads from anyone: the policy only
--      checked the bucket name — no path rule, no quota, no type/size limit.
--
-- From now on the browser goes through the `submit-quote` edge function
-- (validation, rate limits, signed single-file upload URLs, forced status).
-- That function uses the service role, which bypasses RLS, so no insert policy
-- is needed for it.
--
-- !! ORDER OF DEPLOYMENT !!  Apply this migration only AFTER the `submit-quote`
-- function is deployed and the new quote.html / js/quote.js are live — the old
-- page inserts directly and would stop working the moment these policies go.

drop policy if exists "anyone can submit a quote request" on quote_requests;
drop policy if exists "anyone can upload quote photos and videos" on storage.objects;

-- Storage-level limits (apply to signed uploads too). The per-photo 10 MB
-- limit is enforced by submit-quote when the quote is saved; the bucket
-- itself caps any single object at 50 MB and only accepts photo/video types.
update storage.buckets
   set file_size_limit = 52428800,
       allowed_mime_types = array[
         'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
         'video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp'
       ]
 where id = 'quote-uploads';

-- Length / shape limits in the schema itself (NOT VALID = enforced for every
-- new or updated row without failing on rows already stored).
alter table quote_requests
  add constraint quote_requests_name_len check (char_length(name) between 1 and 120) not valid,
  add constraint quote_requests_contact_len check (char_length(contact) between 3 and 200) not valid,
  add constraint quote_requests_service_len check (char_length(service) between 1 and 80) not valid,
  add constraint quote_requests_frequency_len check (char_length(frequency) <= 40) not valid,
  add constraint quote_requests_zone_len check (zone is null or char_length(zone) <= 80) not valid,
  add constraint quote_requests_message_len check (char_length(message) <= 4000) not valid,
  add constraint quote_requests_bedrooms_len check (bedrooms is null or char_length(bedrooms) <= 40) not valid,
  add constraint quote_requests_bathrooms_len check (bathrooms is null or char_length(bathrooms) <= 40) not valid,
  add constraint quote_requests_home_type_len check (home_type is null or char_length(home_type) <= 60) not valid,
  add constraint quote_requests_pets_len check (pets is null or char_length(pets) <= 60) not valid,
  add constraint quote_requests_photos_max check (cardinality(photo_paths) <= 6) not valid,
  add constraint quote_requests_video_len check (video_path is null or char_length(video_path) <= 200) not valid;
