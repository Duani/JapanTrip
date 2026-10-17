-- Apply with `npx supabase db push` for hosted, or `npx supabase migration up` locally.
-- Does not wipe trip_members or existing proposals.
create or replace function public.publish_trip_snapshot(
  p_trip_id text,
  p_snapshot jsonb,
  p_expected_version integer,
  p_proposal_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current integer;
  v_proposal record;
begin
  if auth.uid() is null or not public.is_trip_admin(p_trip_id) then
    raise exception 'Only a trip admin can publish';
  end if;

  -- Serialize all versions of a given trip to prevent stale/conflicting publishes.
  perform 1 from public.trips where id = p_trip_id for update;
  if not found then raise exception 'Trip not found'; end if;

  select coalesce(max(version_number), 0) into v_current
    from public.trip_versions where trip_id = p_trip_id;

  if v_current <> p_expected_version then
    raise exception 'Trip version changed (expected %, found %). Reload first.', p_expected_version, v_current;
  end if;

  if jsonb_typeof(p_snapshot) <> 'object'
    or p_snapshot #>> '{trip,id}' is distinct from p_trip_id
    or jsonb_typeof(p_snapshot -> 'days') <> 'array'
    or jsonb_array_length(p_snapshot -> 'days') = 0
    or jsonb_typeof(p_snapshot -> 'places') <> 'array'
    or jsonb_typeof(p_snapshot -> 'routeLegs') <> 'array'
    or jsonb_typeof(p_snapshot -> 'bookingItems') <> 'array'
    or length(p_snapshot::text) > 2000000 then
    raise exception 'Invalid trip snapshot';
  end if;

  if p_proposal_id is null then
    if v_current <> 0 then raise exception 'Initialization already completed'; end if;
  else
    select * into v_proposal from public.change_proposals
      where id = p_proposal_id and trip_id = p_trip_id for update;
    if not found then raise exception 'Proposal not found'; end if;
    if v_proposal.status not in ('draft', 'approved') then
      raise exception 'Proposal is already processed or rejected';
    end if;
  end if;

  update public.trip_versions set status = 'archived'
    where trip_id = p_trip_id and status = 'published';

  insert into public.trip_versions
    (trip_id, version_number, status, data_snapshot, changelog, created_by, published_at)
  values
    (p_trip_id, v_current + 1, 'published', p_snapshot,
     case when p_proposal_id is null then 'Initialized from reviewed app itinerary'
          else v_proposal.title end,
     auth.uid(), now());

  if p_proposal_id is not null then
    update public.change_proposals set status = 'applied'
      where id = p_proposal_id;
  end if;

  return v_current + 1;
end;
$$;

revoke all on function public.publish_trip_snapshot(text, jsonb, integer, uuid) from public;
revoke all on function public.publish_trip_snapshot(text, jsonb, integer, uuid) from anon;
grant execute on function public.publish_trip_snapshot(text, jsonb, integer, uuid) to authenticated;
