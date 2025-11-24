# SMS Template Customization Guide

You can customize the SMS message that patients receive when they book an appointment.

## Default Template

The default SMS template is:
```
Hi {patientName}, your {visitTypeDisplay} is confirmed for {appointmentDate} at {appointmentTime}. View details: {appointmentLink}{zoomMeetingUrl}
```

## Available Placeholders

You can use these placeholders in your custom template:

- `{patientName}` - Patient's first name (e.g., "John")
- `{fullName}` - Patient's full name (e.g., "John Doe")
- `{appointmentDate}` - Formatted appointment date (e.g., "Monday, December 1, 2024")
- `{appointmentTime}` - Formatted appointment time (e.g., "10:00 AM EST")
- `{visitType}` - Visit type code (e.g., "video", "phone", "async")
- `{visitTypeDisplay}` - Visit type display name (e.g., "Video Visit", "Phone Visit", "Consultation")
- `{appointmentLink}` - Full URL to appointment page (e.g., "https://medazonhealth.com/appointment/abc123...")
- `{zoomMeetingUrl}` - Zoom meeting URL (only included for video appointments)

## Customizing the Template

### Option 1: Environment Variable (Recommended)

Add to your `.env.local` file:

```env
SMS_TEMPLATE=Your custom message here with {patientName}, {appointmentDate}, {appointmentTime}, {appointmentLink}, and {zoomMeetingUrl}
```

### Example Custom Templates

**Short and Simple:**
```env
SMS_TEMPLATE=Hi {patientName}, your appointment is on {appointmentDate} at {appointmentTime}. Details: {appointmentLink}
```

**Detailed:**
```env
SMS_TEMPLATE=Hello {fullName}, your {visitTypeDisplay} with Medazon Health is confirmed for {appointmentDate} at {appointmentTime}. Access your appointment: {appointmentLink}{zoomMeetingUrl} Thank you!
```

**Professional:**
```env
SMS_TEMPLATE=Medazon Health: Appointment confirmed for {fullName} on {appointmentDate} at {appointmentTime}. {visitTypeDisplay} details: {appointmentLink}{zoomMeetingUrl}
```

**Multiline (SMS will be sent as single line):**
```env
SMS_TEMPLATE=Appointment Confirmed - {fullName} - {appointmentDate} at {appointmentTime} - {visitTypeDisplay} - View: {appointmentLink}{zoomMeetingUrl}
```

## Important Notes

1. **SMS Length**: Keep messages under 160 characters for single SMS, or under 320 characters for 2-part SMS to avoid extra costs.

2. **Zoom URL**: The `{zoomMeetingUrl}` placeholder is automatically removed if there's no Zoom meeting (for non-video appointments).

3. **Placeholder Removal**: If you forget to include a placeholder, it will be automatically removed from the final message.

4. **Restart Required**: After changing `SMS_TEMPLATE` in `.env.local`, restart your dev server for changes to take effect.

## Testing Your Template

1. **View Current Template:**
   ```
   GET http://localhost:3000/api/sms-template
   ```

2. **Test SMS:**
   - Visit `http://localhost:3000/test-notifications`
   - Select "SMS Only"
   - Enter your phone number
   - Click "Send Test Notifications"
   - Check the message format

## Template Examples by Use Case

### For Video Appointments
```env
SMS_TEMPLATE=Hi {patientName}, your video consultation is on {appointmentDate} at {appointmentTime}. Join: {zoomMeetingUrl} Or view details: {appointmentLink}
```

### For Phone Appointments
```env
SMS_TEMPLATE=Hi {patientName}, your phone consultation is confirmed for {appointmentDate} at {appointmentTime}. We'll call you. Details: {appointmentLink}
```

### For All Appointment Types
```env
SMS_TEMPLATE=Medazon Health: {fullName}, your {visitTypeDisplay} is scheduled for {appointmentDate} at {appointmentTime}. {appointmentLink}{zoomMeetingUrl}
```

## Character Count Tips

- **Short (under 160 chars)**: Single SMS, lower cost
- **Medium (160-320 chars)**: 2-part SMS, standard cost
- **Long (320+ chars)**: Multiple SMS parts, higher cost

**Example character counts:**
- Default template: ~140 characters (single SMS)
- With all placeholders filled: ~200-250 characters (2-part SMS)

## Troubleshooting

### Template Not Working?
1. Check `.env.local` file exists and has `SMS_TEMPLATE` variable
2. Restart your dev server after changing the template
3. Check for typos in placeholder names (they're case-sensitive)
4. View current template: `GET /api/sms-template`

### Placeholders Not Replacing?
- Make sure placeholder names match exactly (including curly braces)
- Check server logs for any errors
- Test with the test notifications page

### Message Too Long?
- Remove unnecessary placeholders
- Shorten text between placeholders
- Consider removing `{zoomMeetingUrl}` if not needed (it's optional)

