# Incident Response Plan

## Severity Levels

- **SEV-1**: Active compromise, data exfiltration risk, auth bypass, admin takeover.
- **SEV-2**: Exploitable vulnerability with realistic abuse path.
- **SEV-3**: Security weakness without active exploitation.

## Immediate Response Flow

1. Triage and classify severity.
2. Contain impact:
   - revoke/rotate compromised secrets,
   - disable affected routes/features,
   - invalidate impacted sessions.
3. Preserve evidence:
   - collect logs,
   - retain request metadata,
   - snapshot relevant DB state.
4. Remediate root cause in code/config.
5. Validate fix and deploy.
6. Post-incident review with preventive actions.

## Containment Playbooks

### Auth/session compromise
- Rotate WorkOS/related secrets.
- Force sign-out / session invalidation.
- Audit admin role changes and suspicious account activity.

### Stripe/webhook abuse
- Rotate webhook secret.
- Validate replay/signature failures.
- Verify billing state reconciliation in DB.

### Admin account abuse
- Disable affected account.
- Review `admin_audit_logs` for timeline and blast radius.
- Revert unauthorized data mutations.

### Data access anomaly
- Confirm RLS/policy posture.
- Restrict service-role operations to emergency paths.
- Audit recent privileged queries and writes.

## Communication Checklist

- Internal incident channel update every 30-60 minutes (SEV-1/2).
- Stakeholder notification with impact, ETA, and workaround.
- Customer notice if data/privacy impact is confirmed.

## Recovery Criteria

- Exploit path closed.
- Affected secrets/sessions rotated.
- Verification checks passed.
- Monitoring in place for recurrence.
