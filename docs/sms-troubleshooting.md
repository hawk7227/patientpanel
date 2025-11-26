# SMS Delivery Troubleshooting Guide

If you're getting a "SMS sent successfully" message but not receiving the SMS on your phone, follow these troubleshooting steps:

## Quick Checks

### 1. Check ClickSend Dashboard
1. Log in to your [ClickSend Dashboard](https://dashboard.clicksend.com/)
2. Go to **SMS** > **History**
3. Find your message by Message ID
4. Check the **Status** column:
   - **Delivered** = Message reached the phone
   - **Pending** = Still being processed
   - **Failed** = Delivery failed (check error code)
   - **Rejected** = Message was rejected (check reason)

### 2. Verify Phone Number Format
Your phone number should be in **E.164 format**:
- ✅ Correct: `+9231334443536` (Pakistan)
- ✅ Correct: `+1234567890` (US)
- ❌ Wrong: `9231334443536` (missing +)
- ❌ Wrong: `031334443536` (missing country code)

### 3. Check ClickSend Account Status

**Account Credits:**
- Go to ClickSend Dashboard > **Account** > **Balance**
- Make sure you have sufficient credits
- SMS costs vary by country (Pakistan is typically $0.05-0.10 per SMS)

**Account Verification:**
- Some countries require account verification
- Check if your account is fully verified
- Contact ClickSend support if verification is pending

### 4. Sender ID Issues

**For Pakistan (+92) numbers:**
- Sender ID must be approved for Pakistan
- Go to ClickSend Dashboard > **SMS** > **Sender IDs**
- Check if your sender ID is approved for Pakistan
- If not approved, messages may be rejected

**Common Issues:**
- Generic sender IDs (like "Medazon") may not work in all countries
- Some countries require registered sender IDs
- Check ClickSend documentation for country-specific requirements

### 5. Carrier/Network Issues

**Possible causes:**
- Phone is turned off or out of coverage
- Carrier is blocking messages from unknown senders
- Network congestion (wait a few minutes)
- Phone number is invalid or inactive

**Solutions:**
- Try sending to a different phone number
- Check if the recipient's phone is on and has signal
- Ask recipient to check spam/blocked messages
- Try again after 5-10 minutes

### 6. Check Delivery Status via API

You can check the delivery status using the Message ID:

**Via Browser:**
```
http://localhost:3000/api/check-sms-status?messageId=YOUR_MESSAGE_ID
```

**Example:**
```
http://localhost:3000/api/check-sms-status?messageId=1F0C928C-A68E-6E0E-8540-592FFAD8BBA8
```

**Response:**
```json
{
  "success": true,
  "status": "delivered",
  "statusCode": "0",
  "statusText": "Delivered"
}
```

### 7. Common Error Codes

ClickSend provides error codes that indicate why delivery failed:

- **301**: Unknown subscriber - Phone number is invalid or inactive
- **302**: Absent subscriber - Phone is off or out of coverage
- **303**: Network congestion - Try again later
- **304**: Message rejected - Carrier blocked the message
- **305**: Invalid destination - Phone number format is wrong

## Step-by-Step Troubleshooting

### Step 1: Verify Message in ClickSend Dashboard
1. Log in to ClickSend Dashboard
2. Go to **SMS** > **History**
3. Find your message by Message ID: `1F0C928C-A68E-6E0E-8540-592FFAD8BBA8`
4. Check the status and any error messages

### Step 2: Check Phone Number
1. Verify the phone number is correct: `+9231334443536`
2. Make sure it includes country code (+92 for Pakistan)
3. Remove any spaces, dashes, or parentheses

### Step 3: Test with Different Number
1. Try sending to a different phone number
2. If it works, the issue is with the original number
3. If it doesn't work, the issue is with ClickSend configuration

### Step 4: Check ClickSend Account
1. Verify you have credits in your account
2. Check if your account is verified
3. Verify sender ID is approved for Pakistan

### Step 5: Contact ClickSend Support
If none of the above works:
1. Contact ClickSend support with:
   - Message ID: `1F0C928C-A68E-6E0E-8540-592FFAD8BBA8`
   - Phone number: `+9231334443536`
   - Date/time sent
   - Screenshot of the message in dashboard
2. They can check:
   - Delivery status on their end
   - Carrier blocking issues
   - Account/configuration problems

## Testing Tips

### Test with Your Own Number First
Before sending to customers, test with your own phone number to verify:
- ClickSend is working
- Phone number format is correct
- Messages are being delivered

### Use Test Mode
Some ClickSend accounts have a test mode that sends messages to a test number. Check if this is available in your account.

### Check Server Logs
Look at your server console logs for:
- Formatted phone number (should show `+9231334443536`)
- ClickSend API response
- Any error messages

## Still Not Working?

1. **Check ClickSend Dashboard** - This is the most reliable way to see what's happening
2. **Try a different phone number** - Rule out number-specific issues
3. **Contact ClickSend Support** - They have access to detailed delivery logs
4. **Check your ClickSend account settings** - Verify sender ID, account status, credits

## Quick Status Check

Use this URL to check your SMS status (replace with your Message ID):
```
http://localhost:3000/api/check-sms-status?messageId=1F0C928C-A68E-6E0E-8540-592FFAD8BBA8
```

Or check your SMS history:
```
http://localhost:3000/api/check-sms-status?action=history&limit=10
```






