-- TOP Benefits v0.1 — two deliberately different review fixtures.
-- Requires benefits_v01_schema.sql. Safe to re-run; it never overwrites an existing benefit.
--
-- These records remain draft/in_review until a TOP admin approves them in the review flow.
-- Benefit #000001 tests a national official government benefit.
-- Benefit #000002 tests a participating-location commercial discount with no chain-wide promise.
--
-- ROLLBACK: archive the two benefits instead of deleting them once referenced by saves or events.

do $top_benefits_seed_records$
begin
  if not exists (
    select 1 from public.top_benefits where slug = 'va-funding-fee-exemption'
  ) then
    if exists (select 1 from public.top_benefits where benefit_number = 1) then
      raise exception 'Benefit #000001 is already assigned to another record; seed stopped without renumbering.';
    end if;

    insert into public.top_benefits (
      benefit_number,
      slug,
      title,
      provider_name,
      provider_url,
      benefit_type,
      category_tags,
      audience_tags,
      summary,
      description,
      eligibility_summary,
      eligibility_rules,
      availability_scope,
      country_code,
      location_notice,
      redemption_method,
      redemption_steps,
      proof_required,
      offer_value_type,
      value_model,
      savings_summary,
      terms_summary,
      publication_status,
      verification_status,
      evidence_level,
      record_origin,
      last_checked_at,
      next_review_at
    ) values (
      1,
      'va-funding-fee-exemption',
      'VA Funding Fee Exemption',
      'U.S. Department of Veterans Affairs',
      'https://www.va.gov/housing-assistance/home-loans/funding-fee-and-closing-costs/',
      'waiver',
      array['housing', 'financial', 'va_home_loan', 'homeownership'],
      array['veteran', 'disabled_veteran', 'active_duty', 'surviving_spouse', 'purple_heart'],
      'Eligible VA home-loan borrowers do not pay the one-time VA funding fee.',
      'The exemption can remove a fee that otherwise varies by loan type, loan amount, down payment, and prior use of the VA home-loan benefit. Certain borrowers may also qualify for a refund when a later VA disability award is retroactive to before closing.',
      'Applies to qualifying compensation recipients, certain compensation-eligible service members or retirees, certain surviving spouses receiving DIC, eligible pre-discharge claimants, and active-duty Purple Heart recipients who meet the VA timing rules.',
      jsonb_build_object(
        'qualifying_paths', jsonb_build_array(
          'Receiving VA compensation for a service-connected disability',
          'Eligible for VA disability compensation but receiving retirement or active-duty pay instead',
          'Receiving Dependency and Indemnity Compensation as a surviving spouse',
          'Pre-discharge proposed or memorandum rating establishes compensation eligibility before closing',
          'Active-duty borrower provides Purple Heart evidence on or before closing'
        ),
        'refund_rule', 'A later VA disability award may support a refund only when its effective date is before the loan closing date.',
        'confirmation_owner', 'VA-approved lender or VA Regional Loan Center'
      ),
      'national',
      'US',
      'National benefit for qualifying VA-backed or VA direct home loans; lender confirmation is still required for the borrower and loan.',
      'lender_or_provider',
      array[
        'Ask the VA-approved lender to confirm the funding-fee status before closing.',
        'Review the Certificate of Eligibility and any VA rating or DIC documentation the lender requests.',
        'For a possible retroactive refund, contact the loan servicer or a VA Regional Loan Center.'
      ],
      array['Eligibility evidence required by the VA-approved lender for the applicable qualifying path'],
      'fee_waiver',
      jsonb_build_object(
        'basis', 'otherwise_applicable_va_funding_fee',
        'published_rate_range_percent', jsonb_build_array(0.5, 3.3),
        'rate_factors', jsonb_build_array('loan type', 'loan amount', 'down payment', 'first or subsequent use')
      ),
      'Savings equal the VA funding fee that would otherwise apply. VA-published rates currently range from 0.5% to 3.3%, depending on the loan.',
      'Eligibility and refund timing are controlled by VA rules. Borrowers should confirm their exact status with the lender or VA Regional Loan Center.',
      'draft',
      'in_review',
      'official',
      'manual',
      now(),
      now() + interval '180 days'
    );
  end if;

  if not exists (
    select 1 from public.top_benefits where slug = 'chick-fil-a-military-discounts-location-dependent'
  ) then
    if exists (select 1 from public.top_benefits where benefit_number = 2) then
      raise exception 'Benefit #000002 is already assigned to another record; seed stopped without renumbering.';
    end if;

    insert into public.top_benefits (
      benefit_number,
      slug,
      title,
      provider_name,
      provider_url,
      benefit_type,
      category_tags,
      audience_tags,
      summary,
      description,
      eligibility_summary,
      eligibility_rules,
      availability_scope,
      country_code,
      location_notice,
      redemption_method,
      redemption_steps,
      proof_required,
      offer_value_type,
      value_model,
      savings_summary,
      terms_summary,
      publication_status,
      verification_status,
      evidence_level,
      record_origin,
      last_checked_at,
      next_review_at
    ) values (
      2,
      'chick-fil-a-military-discounts-location-dependent',
      'Chick-fil-A Military Discounts (Location Dependent)',
      'Chick-fil-A',
      'https://www.chick-fil-a.com/customer-support/events-and-promotions/local-events/does-chick-fil-a-offer-discounts-for-veterans-senior-citizens-students-and-other-special-groups',
      'discount',
      array['food', 'restaurant', 'everyday_discount', 'local_offer'],
      array['veteran', 'active_duty'],
      'Some locally operated Chick-fil-A restaurants may offer a military discount or military-appreciation promotion, but there is no guaranteed chain-wide offer.',
      'Chick-fil-A states that discounts are controlled by each local Owner-Operator. An offer may be an everyday discount, a free item, or a holiday promotion, and the amount and timing can differ by restaurant.',
      'Eligibility, accepted proof of service, offer value, and redemption timing are set by each participating restaurant.',
      jsonb_build_object(
        'chainwide_guarantee', false,
        'local_operator_discretion', true,
        'confirmation_required', true
      ),
      'participating_locations',
      'US',
      'Do not assume every Chick-fil-A participates. Check the restaurant in the Chick-fil-A app, its social page, or contact it directly. ZIP results must distinguish verified locations from ask-locally leads.',
      'in_person',
      array[
        'Find the intended restaurant by address or ZIP code.',
        'Check that restaurant''s app listing or social page, or contact the restaurant directly.',
        'Confirm the current offer and required proof before ordering.'
      ],
      array['Varies by participating restaurant; ask the location what proof it accepts'],
      'variable',
      jsonb_build_object(
        'chainwide_rate', null,
        'possible_offer_forms', jsonb_build_array('discount', 'free item', 'holiday promotion'),
        'must_confirm_locally', true
      ),
      'Savings vary by restaurant and promotion. TOP must not present a reported 10% rate as a chain-wide guarantee.',
      'Availability is at the discretion of the local Owner-Operator and may be limited to a holiday or event. Confirm before visiting.',
      'draft',
      'in_review',
      'official',
      'manual',
      now(),
      now() + interval '90 days'
    );
  end if;
end
$top_benefits_seed_records$;

insert into public.top_benefit_sources (
  benefit_id,
  source_type,
  source_url,
  source_title,
  source_owner,
  claim_supported,
  evidence_status,
  is_primary,
  last_checked_at,
  source_metadata
)
select
  b.id,
  'government',
  'https://www.va.gov/housing-assistance/home-loans/funding-fee-and-closing-costs/',
  'VA funding fee and loan closing costs',
  'U.S. Department of Veterans Affairs',
  'Lists the funding-fee exemption paths, refund timing rule, and current fee-rate structure.',
  'supports',
  true,
  now(),
  jsonb_build_object('official', true, 'last_updated_by_source', '2026-01-15')
from public.top_benefits b
where b.slug = 'va-funding-fee-exemption'
on conflict (benefit_id, source_url) do nothing;

insert into public.top_benefit_sources (
  benefit_id,
  source_type,
  source_url,
  source_title,
  source_owner,
  claim_supported,
  evidence_status,
  is_primary,
  last_checked_at,
  source_metadata
)
select
  b.id,
  'provider_policy',
  'https://www.chick-fil-a.com/customer-support/events-and-promotions/local-events/does-chick-fil-a-offer-discounts-for-veterans-senior-citizens-students-and-other-special-groups',
  'Does Chick-fil-A offer discounts for veterans and other special groups?',
  'Chick-fil-A',
  'Confirms that discounts are optional, controlled by local Owner-Operators, and not guaranteed at all restaurants.',
  'supports',
  true,
  now(),
  jsonb_build_object('official', true, 'chainwide_guarantee', false)
from public.top_benefits b
where b.slug = 'chick-fil-a-military-discounts-location-dependent'
on conflict (benefit_id, source_url) do nothing;

insert into public.top_benefit_review_items (
  dedupe_key,
  benefit_id,
  candidate_kind,
  origin,
  status,
  risk_level,
  confidence_score,
  proposed_patch,
  evidence,
  explanation
)
select
  'bootstrap:benefit:000001',
  b.id,
  'new_benefit',
  'system',
  'pending',
  'normal',
  1.0,
  jsonb_build_object('publication_status', 'published', 'verification_status', 'verified'),
  jsonb_build_array(jsonb_build_object(
    'url', 'https://www.va.gov/housing-assistance/home-loans/funding-fee-and-closing-costs/',
    'source_type', 'government'
  )),
  'Human review required before the first national TOP Benefits record is published.'
from public.top_benefits b
where b.slug = 'va-funding-fee-exemption'
on conflict (dedupe_key) do nothing;

insert into public.top_benefit_review_items (
  dedupe_key,
  benefit_id,
  candidate_kind,
  origin,
  status,
  risk_level,
  confidence_score,
  proposed_patch,
  evidence,
  explanation
)
select
  'bootstrap:benefit:000002',
  b.id,
  'new_benefit',
  'system',
  'pending',
  'high',
  1.0,
  jsonb_build_object('publication_status', 'published', 'verification_status', 'verified'),
  jsonb_build_array(jsonb_build_object(
    'url', 'https://www.chick-fil-a.com/customer-support/events-and-promotions/local-events/does-chick-fil-a-offer-discounts-for-veterans-senior-citizens-students-and-other-special-groups',
    'source_type', 'provider_policy',
    'chainwide_guarantee', false
  )),
  'Human review must preserve the participating-location warning and must not invent a chain-wide rate.'
from public.top_benefits b
where b.slug = 'chick-fil-a-military-discounts-location-dependent'
on conflict (dedupe_key) do nothing;

select setval(
  'public.top_benefit_number_seq',
  greatest((select coalesce(max(benefit_number), 1) from public.top_benefits), 1),
  true
);
