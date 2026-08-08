# TOP Benefits v0.1

## Product constitution

1. **Benefits is its own product surface.** It is not a nonprofit-directory filter. The Benefits tab and saved Benefits lists remain separate from the Directory and saved organizations.
2. **Benefits is the umbrella.** Discounts, freebies, hidden gems, grants, scholarships, programs, waivers, refunds, travel opportunities, and services are separate record types in one Benefits catalog.
3. **One record makes one clear promise.** Each record states who qualifies, where it applies, how to use it, what proof may be required, what it may save, and the important limitations.
4. **Location is evidence, not decoration.** National and online benefits can appear for every ZIP. Statewide records require a matching state. Local and participating-location records must distinguish a verified nearby location from an unconfirmed “ask locally” lead.
5. **No chain-wide promise from a local report.** A forum post, member report, or single franchise confirmation cannot turn into a nationwide claim. It remains labeled by evidence level until corroborated.
6. **Every published benefit has provenance.** Published records require at least one source, a last-checked date, a next-review date, verified status, and a completed human review.
7. **Agents investigate; humans publish.** Scheduled research agents may create review items, attach evidence, flag expiration, and propose patches. They do not directly publish, rewrite, pause, or delete catalog records.
8. **Stale is visible and recoverable.** Expired or disputed benefits are paused or archived, not erased. Review history and source history remain available to staff.
9. **Benefit IDs are permanent.** The six-digit `public_id` begins with `000001`, never changes, and is never reused after archive.
10. **Savings claims come from usage.** TOP records member-reported, receipt-supported, and system-calculated savings events separately. Public totals must state which statuses are included and must never multiply a theoretical maximum by audience size.
11. **Sharing is scoped to Benefits.** Members can save benefits to Benefits-only lists and share an unlisted or member-visible list without mixing nonprofit favorites into it.
12. **Community rollups use approved records only.** Weekly “new Benefits” posts are generated only from newly published or materially updated benefits after human review.

## V1 record contract

`top_benefits` is the canonical record. Supporting tables keep volatile or repeatable data out of the main row:

| Concern | Table | Rule |
| --- | --- | --- |
| Canonical claim | `top_benefits` | Six-digit ID, type, audience, eligibility, geography, redemption, value, lifecycle |
| Evidence | `top_benefit_sources` | Multiple supporting, contradicting, contextual, or unverified sources |
| ZIP/local availability | `top_benefit_locations` | One row per verified/reported provider location or service area |
| Human inbox | `top_benefit_review_items` | Agent, member, admin, and system proposals; no auto-apply trigger |
| Save/share | `top_benefit_lists`, `top_benefit_list_items` | Separate from saved nonprofits; private, members, or unlisted visibility |
| Savings rollup | `top_benefit_savings_events` | Actual usage events with source and reporting status |

## Verification language

| Evidence level | Public meaning |
| --- | --- |
| `official` | A government or provider-wide official source supports the claim |
| `provider_confirmed` | The provider directly confirmed the claim, but it is not a published policy |
| `official_local` | An official local branch or franchise source supports only that location |
| `community_confirmed` | Multiple credible reports agree, but no official source is available |
| `community_reported` | A useful lead from a member, forum, or social post; not yet corroborated |
| `unverified` | Research is incomplete; never public as a verified promise |

Publication and verification are intentionally separate. A verified record can be paused, and a draft can contain strong official evidence while waiting for admin approval.

## ZIP behavior

When the user searches a ZIP code, the API should return three clearly labeled groups:

1. **Available anywhere:** national, online, and applicable statewide benefits.
2. **Verified near you:** matching verified rows from `top_benefit_locations`.
3. **Worth asking locally:** participating-location records with no verified nearby row. These must display the location warning and cannot show a guaranteed percentage or dollar value.

Location-dependent restaurant reports belong in the third group until a specific location is verified and added to `top_benefit_locations`. The initial Chick-fil-A fixture is different: it documents the official Chick-fil-A One Community Helper ID.me path and makes no fixed discount promise.

## First two records

- **Benefit #000001 — VA Funding Fee Exemption:** national, official, fee-waiver logic with eligibility and refund timing.
- **Benefit #000002 — Chick-fil-A Community Helper Recognition via ID.me:** official online verification program for supported Community Helper groups, with an explicit no-guaranteed-reward warning.

Both are seeded as `draft` + `in_review`. The seed also creates one pending review item per record. The first admin UI pass should approve, reject, or request more information; publishing must be an explicit human action.

## Build sequence

1. Apply `web/supabase/benefits_v01_schema.sql` in QA.
2. Apply `web/supabase/benefits_v01_seed.sql` in QA.
3. Build server-only public/member/admin Benefits APIs.
4. Build the admin review queue and approve the two fixtures.
5. Build the Benefits tab, ZIP search, detail card, save/share list, and savings event flow.
6. Build the Community weekly rollup from approved publication events.
7. Add scheduled research agents that write only to `top_benefit_review_items`.

## Verification queries

```sql
select public_id, title, publication_status, verification_status, availability_scope
from public.top_benefits
order by benefit_number;

select r.status, r.candidate_kind, b.public_id, b.title
from public.top_benefit_review_items r
left join public.top_benefits b on b.id = r.benefit_id
order by r.created_at;

select b.public_id, count(s.id) as source_count
from public.top_benefits b
left join public.top_benefit_sources s on s.benefit_id = b.id
group by b.id, b.public_id
order by b.benefit_number;
```

Expected after the seed: two benefits, two pending review items, and one official primary source per benefit.
