# Compliance Guide for Deployers

If you're deploying Prompt Architect for your own use or organization, you need to understand your legal and compliance obligations. **This guide is for information only and is not legal advice. Consult a lawyer for your specific situation.**

## 🌍 Who This Applies To

If you're deploying Prompt Architect and:
- ✅ Collecting user emails for authentication
- ✅ Storing user-generated content (prompts, knowledge bases)
- ✅ Operating in the EU, California, or other jurisdictions with data protection laws

Then you need to comply with applicable regulations.

## 📋 Required Legal Pages

### 1. Privacy Policy

**Required if**: You collect any personal data (emails, usage data, etc.)

**Must cover**:
- What personal data you collect
- How you use that data
- How long you store it
- Who you share it with (if anyone)
- User rights (access, deletion, portability)
- Your contact information for data requests
- Cookie usage (if applicable)

**Where to get one**:
- [Termly](https://termly.io/) - Free generator
- [TermsFeed](https://www.termsfeed.com/) - Free generator
- Hire a lawyer for custom policy

**Implementation**:
- Create a `/privacy` page with your policy
- Link from footer on all pages
- Link during signup flow

### 2. Terms of Service

**Required if**: You're providing a service to users

**Must cover**:
- Acceptable use policy
- Intellectual property rights
- Liability limitations
- Service availability (uptime)
- Termination rights
- Dispute resolution

**Where to get one**:
- Same generators as privacy policy
- Hire a lawyer for enforceable terms

**Implementation**:
- Create a `/terms` page
- Link from footer
- Optionally require acceptance during signup

## 🇪🇺 GDPR Compliance (EU Users)

**Applies if**: You have users in the European Union

### Key Requirements

1. **Legal Basis for Processing**:
   - User consent (signup = consent)
   - Legitimate interest (service functionality)
   - Document your legal basis

2. **User Rights**:
   - ✅ **Right to access**: Users can view their data (already supported)
   - ✅ **Right to deletion**: Users can delete account (already supported)
   - ⚠️ **Right to portability**: Add data export feature
   - ⚠️ **Right to rectification**: Users can edit their data

3. **Data Protection**:
   - ✅ Encryption in transit (HTTPS)
   - ✅ Encryption at rest (Supabase handles this)
   - ✅ RLS policies (access control)
   - ✅ Secure authentication

4. **Breach Notification**:
   - Must notify authorities within 72 hours of breach
   - Must notify users if high risk
   - Keep incident response plan

5. **Data Processing Agreement (DPA)**:
   - Required if processing data for others
   - Supabase provides DPA for their services

### Quick Implementation

**Add Data Export**:
```typescript
// Allow users to export their data
const exportData = async () => {
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id);
  
  const { data: prompts } = await supabase
    .from('prompt_records')
    .select('*')
    .eq('user_id', user.id);
  
  const blob = new Blob([JSON.stringify({ projects, prompts }, null, 2)]);
  // Trigger download
};
```

**Cookie Consent Banner** (if using analytics):
```typescript
// Use a library like react-cookie-consent
import CookieConsent from "react-cookie-consent";

<CookieConsent>
  We use cookies to improve your experience. 
  See our Privacy Policy.
</CookieConsent>
```

## 🇺🇸 CCPA Compliance (California Users)

**Applies if**: You have users in California

### Key Requirements

1. **Privacy Notice**:
   - Must disclose categories of data collected
   - Must disclose how data is used
   - Must disclose if data is sold (yours isn't)

2. **User Rights**:
   - ✅ Right to know what data is collected
   - ✅ Right to delete data
   - ⚠️ Right to opt-out of data sales (add "Do Not Sell" link even if not selling)

3. **Implementation**:
   - Add "Do Not Sell My Personal Information" link in footer
   - Link to your privacy policy
   - Honor deletion requests within 45 days

## 🔒 Security Best Practices

### Already Implemented ✅
- HTTPS encryption
- Row Level Security (RLS)
- Secure authentication (Supabase Auth)
- Hashed passwords
- Session management
- CORS configuration

### Recommended Additions ⚠️

1. **Enable Leaked Password Protection**:
   ```bash
   # In Supabase dashboard
   Authentication → Policies → Enable Leaked Password Protection
   ```

2. **Rate Limiting**:
   - Prevent abuse of API endpoints
   - Protect against DDoS attacks
   - Can implement in edge functions

3. **Audit Logging**:
   - Log important user actions
   - Monitor for suspicious activity
   - Retain logs for security investigation

4. **Regular Security Updates**:
   - Keep dependencies updated
   - Monitor for CVEs
   - Use `npm audit` regularly

## 📧 Email Compliance

If sending emails to users:

### CAN-SPAM Act (US)
- ✅ Include physical address in emails
- ✅ Provide unsubscribe link
- ✅ Honor unsubscribe within 10 days
- ✅ Don't use misleading subject lines

### GDPR (EU)
- ✅ Get explicit consent before sending marketing emails
- ✅ Transactional emails (password reset, etc.) are fine
- ✅ Provide easy unsubscribe

## 🌐 International Considerations

### Multi-Jurisdiction Deployment
If serving users globally:
- Choose strictest standard (usually GDPR)
- Document data flows and storage locations
- Consider data residency requirements
- Review export control laws for AI models

### Specific Regulations to Research
- **Brazil**: LGPD (similar to GDPR)
- **China**: Personal Information Protection Law (PIPL)
- **Canada**: PIPEDA
- **Australia**: Privacy Act 1988
- **India**: Digital Personal Data Protection Act

## 📊 Data Retention

**Recommendation**:
- Active user data: Keep while account active
- Deleted accounts: Purge within 30 days
- Logs: Retain 90 days for security
- Backups: 30-day retention with encryption

**Implementation**:
```sql
-- Scheduled deletion of old records
CREATE OR REPLACE FUNCTION delete_old_data()
RETURNS void AS $$
BEGIN
  -- Delete data from deleted users after 30 days
  DELETE FROM projects 
  WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE deleted_at < NOW() - INTERVAL '30 days'
  );
END;
$$ LANGUAGE plpgsql;
```

## 🎯 Compliance Checklist

Before going live:

### Legal
- [ ] Privacy Policy created and published
- [ ] Terms of Service created and published
- [ ] Legal pages linked in footer
- [ ] Privacy policy linked during signup
- [ ] "Do Not Sell" link (if CA users)
- [ ] Cookie consent banner (if using analytics)

### Security
- [ ] HTTPS enabled (automatic on most platforms)
- [ ] RLS policies tested and working
- [ ] Leaked password protection enabled
- [ ] Secrets properly secured (not in code)
- [ ] Regular backups configured
- [ ] Incident response plan documented

### Data Protection
- [ ] Data export feature implemented
- [ ] Account deletion tested
- [ ] Data retention policy defined
- [ ] Encryption verified (in-transit and at-rest)
- [ ] Access controls tested (RLS)

### Operational
- [ ] Support email for data requests
- [ ] Process for handling deletion requests
- [ ] Process for handling export requests
- [ ] Process for breach notification (hope you never need it)
- [ ] Regular security audits scheduled

## 🚨 What If You Ignore This?

**Risks of non-compliance**:
- **GDPR**: Fines up to €20M or 4% of global revenue
- **CCPA**: Fines up to $7,500 per violation
- **Lawsuits**: Class action lawsuits from users
- **Reputation**: Loss of user trust
- **Business**: Potential shutdown by authorities

**Bottom line**: Compliance isn't optional if you're collecting user data.

## 🎓 Additional Resources

- [GDPR Official Text](https://gdpr-info.eu/)
- [CCPA Official Text](https://oag.ca.gov/privacy/ccpa)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CAN-SPAM Act](https://www.ftc.gov/tips-advice/business-center/guidance/can-spam-act-compliance-guide-business)

## ⚖️ Disclaimer

This guide is for informational purposes only and does not constitute legal advice. Laws vary by jurisdiction and change frequently. Consult with a qualified attorney in your jurisdiction before deploying this software to ensure compliance with all applicable laws and regulations.

The maintainers of Prompt Architect are not responsible for your compliance obligations when you deploy this software.

---

**Need help?** Open a GitHub Discussion for community support, or consult a lawyer for legal advice.
